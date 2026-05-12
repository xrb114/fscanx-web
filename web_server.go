package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os/exec"
	"runtime"
	"strings"
	"sync"
	"time"

	"golang.org/x/net/websocket"
)

type scanTask struct {
	ID        string    `json:"id"`
	Target    string    `json:"target"`
	Status    string    `json:"status"`
	StartedAt time.Time `json:"startedAt"`
	Modules   []string  `json:"modules"`
	Speed     int       `json:"speed"`
}

type wsMsg struct {
	Type    string      `json:"type"`
	Message string      `json:"message,omitempty"`
	Status  string      `json:"status,omitempty"`
	Stats   interface{} `json:"stats,omitempty"`
}

type serverState struct {
	mu      sync.RWMutex
	tasks   map[string]*scanTask
	cancel  map[string]context.CancelFunc
	logs    map[string][]string
	clients map[string]map[*websocket.Conn]struct{}
	exePath string
}

func startWebServer() {
	state := &serverState{tasks: map[string]*scanTask{}, cancel: map[string]context.CancelFunc{}, logs: map[string][]string{}, clients: map[string]map[*websocket.Conn]struct{}{}, exePath: "./fscanx.exe"}

	http.HandleFunc("/api/scan/start", state.handleStart)
	http.HandleFunc("/api/scan/tasks", state.handleTasks)
	http.HandleFunc("/api/scan/logs/", state.handleLogs)
	http.HandleFunc("/api/scan/results/", state.handleResults)
	http.HandleFunc("/api/scan/stop/", state.handleStop)
	http.Handle("/ws/task/", websocket.Handler(state.handleWs))
	fmt.Println("[web] listening at :8080")
	_ = http.ListenAndServe(":8080", nil)
}

func (s *serverState) handleStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		Target, Ports, Proxy string
		Threads, Timeout     int
		Modules              []string
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), 400)
		return
	}
	id := fmt.Sprintf("task-%d", time.Now().UnixNano())
	task := &scanTask{ID: id, Target: req.Target, Status: "running", StartedAt: time.Now(), Modules: req.Modules}
	ctx, cancel := context.WithCancel(context.Background())

	s.mu.Lock()
	s.tasks[id] = task
	s.cancel[id] = cancel
	s.logs[id] = []string{}
	s.mu.Unlock()
	go s.runTask(ctx, task, req)
	_ = json.NewEncoder(w).Encode(map[string]string{"id": id})
}

func (s *serverState) runTask(ctx context.Context, task *scanTask, req struct {
	Target, Ports, Proxy string
	Threads, Timeout     int
	Modules              []string
}) {
	args := []string{"-h", req.Target, "-p", req.Ports, "-t", fmt.Sprintf("%d", req.Threads), "-time", fmt.Sprintf("%d", req.Timeout)}
	if req.Proxy != "" {
		args = append(args, "-proxy", req.Proxy)
	}
	cmd := exec.CommandContext(ctx, s.exePath, args...)
	stdout, _ := cmd.StdoutPipe()
	stderr, _ := cmd.StderrPipe()
	if err := cmd.Start(); err != nil {
		s.appendLog(task.ID, "[error] "+err.Error())
		s.setStatus(task.ID, "failed")
		return
	}

	s.appendLog(task.ID, "[info] scan started: "+strings.Join(args, " "))
	go s.pipe(task.ID, stdout)
	go s.pipe(task.ID, stderr)
	err := cmd.Wait()
	if ctx.Err() == context.Canceled {
		s.setStatus(task.ID, "stopped")
		s.appendLog(task.ID, "[stop] task canceled")
		return
	}
	if err != nil {
		s.setStatus(task.ID, "failed")
		s.appendLog(task.ID, "[error] "+err.Error())
		return
	}
	s.setStatus(task.ID, "completed")
	s.appendLog(task.ID, "[done] scan completed")
}

func (s *serverState) pipe(taskID string, rc interface{ Read([]byte) (int, error) }) {
	sc := bufio.NewScanner(rc)
	for sc.Scan() {
		s.appendLog(taskID, sc.Text())
	}
}

func (s *serverState) appendLog(taskID, line string) {
	s.mu.Lock()
	s.logs[taskID] = append(s.logs[taskID], line)
	clients := s.clients[taskID]
	s.mu.Unlock()
	msg, _ := json.Marshal(wsMsg{Type: "log", Message: line})
	for c := range clients {
		_, _ = c.Write(msg)
	}
}
func (s *serverState) setStatus(taskID, status string) {
	s.mu.Lock()
	if t, ok := s.tasks[taskID]; ok {
		t.Status = status
	}
	clients := s.clients[taskID]
	s.mu.Unlock()
	msg, _ := json.Marshal(wsMsg{Type: "status", Status: status})
	for c := range clients {
		_, _ = c.Write(msg)
	}
}

func (s *serverState) handleTasks(w http.ResponseWriter, _ *http.Request) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*scanTask, 0, len(s.tasks))
	for _, t := range s.tasks {
		out = append(out, t)
	}
	_ = json.NewEncoder(w).Encode(out)
}
func (s *serverState) handleLogs(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/scan/logs/")
	s.mu.RLock()
	logs := append([]string{}, s.logs[id]...)
	s.mu.RUnlock()
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"logs": logs})
}
func (s *serverState) handleResults(w http.ResponseWriter, r *http.Request) {
	_ = json.NewEncoder(w).Encode(map[string]interface{}{"id": strings.TrimPrefix(r.URL.Path, "/api/scan/results/"), "note": "请按日志解析结果或扩展数据库落地"})
}
func (s *serverState) handleStop(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/scan/stop/")
	s.mu.RLock()
	c := s.cancel[id]
	s.mu.RUnlock()
	if c != nil {
		c()
	}
	_ = json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func (s *serverState) handleWs(ws *websocket.Conn) {
	id := strings.TrimPrefix(ws.Request().URL.Path, "/ws/task/")
	s.mu.Lock()
	if s.clients[id] == nil {
		s.clients[id] = map[*websocket.Conn]struct{}{}
	}
	s.clients[id][ws] = struct{}{}
	s.mu.Unlock()
	defer func() { s.mu.Lock(); delete(s.clients[id], ws); s.mu.Unlock(); _ = ws.Close() }()
	for {
		var m runtime.MemStats
		runtime.ReadMemStats(&m)
		stats := map[string]interface{}{"cpu": nil, "memory": float64(m.Alloc) / 1024 / 1024, "threads": runtime.NumGoroutine(), "online": true}
		msg, _ := json.Marshal(wsMsg{Type: "stats", Stats: stats})
		if _, err := ws.Write(msg); err != nil {
			return
		}
		time.Sleep(2 * time.Second)
	}
}
