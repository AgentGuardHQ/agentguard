package hook

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"
)

// OctiBridge writes session telemetry to Octi Pulpo's memory store via HTTP,
// bridging human CLI sessions into the swarm's episodic memory.
type OctiBridge struct {
	baseURL string
	client  *http.Client
}

// NewOctiBridge creates a bridge from env vars.
// Returns nil if OCTI_HTTP_URL is not set (bridge disabled).
func NewOctiBridge() *OctiBridge {
	url := os.Getenv("OCTI_HTTP_URL")
	if url == "" {
		return nil
	}
	return &OctiBridge{
		baseURL: strings.TrimRight(url, "/"),
		client:  &http.Client{Timeout: 2 * time.Second},
	}
}

// memoryPayload matches Octi Pulpo's memory_store MCP tool input.
type memoryPayload struct {
	Content string   `json:"content"`
	Topics  []string `json:"topics"`
	AgentID string   `json:"agent_id"`
}

// RecordSession stores a CLI session summary as an episodic memory.
func (b *OctiBridge) RecordSession(sessionID, agentName, driver string, state SessionState) {
	if b == nil {
		return
	}

	var parts []string
	parts = append(parts, fmt.Sprintf("Task: CLI session by %s via %s", agentName, driver))
	parts = append(parts, fmt.Sprintf("Type: cli-session | Driver: %s | Agent: %s", driver, agentName))
	parts = append(parts, "Outcome: completed")

	if len(state.WrittenFiles) > 0 {
		files := state.WrittenFiles
		if len(files) > 10 {
			files = append(files[:10], fmt.Sprintf("... +%d more", len(state.WrittenFiles)-10))
		}
		parts = append(parts, fmt.Sprintf("Files written: %s", strings.Join(files, ", ")))
	}

	retryTotal := 0
	for _, v := range state.RetryCounts {
		retryTotal += v
	}
	if retryTotal > 0 {
		parts = append(parts, fmt.Sprintf("Governance retries: %d", retryTotal))
	}
	if state.TestsPass {
		parts = append(parts, "Tests: passed")
	}
	if state.FormatPass {
		parts = append(parts, "Format: passed")
	}

	payload := memoryPayload{
		Content: strings.Join(parts, "\n"),
		Topics:  []string{"task-outcome", "cli-session", driver, agentName},
		AgentID: fmt.Sprintf("%s:%s", driver, agentName),
	}

	b.post("/api/memory", payload)
}

// RecordDenial stores a governance denial event as an episodic memory.
// Only high-signal events — denials indicate governance learning opportunities.
func (b *OctiBridge) RecordDenial(tool, reason, agentID string) {
	if b == nil {
		return
	}

	payload := memoryPayload{
		Content: fmt.Sprintf("Governance denial in CLI session: tool=%s, reason=%s", tool, reason),
		Topics:  []string{"governance-denial", tool},
		AgentID: agentID,
	}

	b.post("/api/memory", payload)
}

func (b *OctiBridge) post(path string, payload any) {
	data, err := json.Marshal(payload)
	if err != nil {
		return
	}

	req, err := http.NewRequest("POST", b.baseURL+path, bytes.NewReader(data))
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")

	// Fire and forget — 2s timeout, don't block the hook.
	go func() {
		resp, err := b.client.Do(req)
		if err == nil {
			resp.Body.Close()
		}
	}()
}
