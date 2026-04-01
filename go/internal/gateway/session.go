package gateway

import (
	"fmt"
	"sync"
	"time"
)

// SessionState tracks session-level metrics for invariant enforcement.
// It is safe for concurrent use.
type SessionState struct {
	mu sync.Mutex
	cfg SessionConfig

	TotalActions    int
	TotalDenials    int
	CumulativeBlast float64
	TokensUsed      int
	Locked          bool

	// fingerprints tracks consecutive occurrences of the same action fingerprint
	fingerprints map[string]int

	// actionTimes records when each action was performed, for velocity checking
	actionTimes []time.Time
}

// SessionCheckResult is the outcome of checking session-level invariants.
type SessionCheckResult struct {
	OK      bool
	Reason  string // machine-readable reason code
	Message string // human-readable explanation
}

// NewSessionState creates a new session state with the given configuration.
func NewSessionState(cfg SessionConfig) *SessionState {
	return &SessionState{
		cfg:          cfg,
		fingerprints: make(map[string]int),
		actionTimes:  make([]time.Time, 0, 64),
	}
}

// RecordAction records a completed action in the session state.
func (s *SessionState) RecordAction(fingerprint string, blastRadius float64, denied bool) {
	s.recordActionAt(fingerprint, blastRadius, denied, time.Now())
}

// recordActionAt records an action at a specific time (for testing).
func (s *SessionState) recordActionAt(fingerprint string, blastRadius float64, denied bool, at time.Time) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.TotalActions++
	s.CumulativeBlast += blastRadius
	s.fingerprints[fingerprint]++
	s.actionTimes = append(s.actionTimes, at)
}

// RecordDenial records a denial in the session state.
func (s *SessionState) RecordDenial() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.TotalDenials++
}

// CheckInvariants evaluates all session-level invariants and returns the first
// violation found, or an OK result if all pass.
func (s *SessionState) CheckInvariants(fingerprint string) SessionCheckResult {
	return s.checkInvariantsAt(fingerprint, time.Now())
}

// checkInvariantsAt evaluates invariants at a specific time (for testing).
func (s *SessionState) checkInvariantsAt(fingerprint string, now time.Time) SessionCheckResult {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 1. Session locked — hard deny
	if s.Locked {
		return SessionCheckResult{
			OK:      false,
			Reason:  "session_locked",
			Message: "session is locked due to previous violations",
		}
	}

	// 2. Budget exceeded
	if s.cfg.BudgetTokens > 0 && s.TokensUsed > s.cfg.BudgetTokens {
		return SessionCheckResult{
			OK:      false,
			Reason:  "budget_exceeded",
			Message: fmt.Sprintf("token budget exceeded: %d/%d", s.TokensUsed, s.cfg.BudgetTokens),
		}
	}

	// 3. Blast radius exceeded
	if s.cfg.MaxBlastRadius > 0 && s.CumulativeBlast > s.cfg.MaxBlastRadius {
		return SessionCheckResult{
			OK:      false,
			Reason:  "blast_radius_exceeded",
			Message: fmt.Sprintf("cumulative blast radius %.1f exceeds threshold %.1f", s.CumulativeBlast, s.cfg.MaxBlastRadius),
		}
	}

	// 4. Runaway detection: same fingerprint > 3 times
	if count, ok := s.fingerprints[fingerprint]; ok && count >= 3 {
		return SessionCheckResult{
			OK:      false,
			Reason:  "runaway",
			Message: fmt.Sprintf("action fingerprint repeated %d times (runaway detected)", count),
		}
	}

	// 5. Velocity: actions per minute
	if s.cfg.MaxActionsPerMinute > 0 {
		cutoff := now.Add(-1 * time.Minute)
		recentCount := 0
		for _, t := range s.actionTimes {
			if t.After(cutoff) {
				recentCount++
			}
		}
		if recentCount >= s.cfg.MaxActionsPerMinute {
			return SessionCheckResult{
				OK:      false,
				Reason:  "velocity_exceeded",
				Message: fmt.Sprintf("action velocity %d/min exceeds threshold %d/min", recentCount, s.cfg.MaxActionsPerMinute),
			}
		}
	}

	// 6. Max denials
	if s.cfg.MaxDenials > 0 && s.TotalDenials >= s.cfg.MaxDenials {
		s.Locked = true
		return SessionCheckResult{
			OK:      false,
			Reason:  "max_denials_exceeded",
			Message: fmt.Sprintf("total denials %d reached limit %d — session locked", s.TotalDenials, s.cfg.MaxDenials),
		}
	}

	// 7. Denial density > 50% (only check after at least 4 actions to avoid false positives)
	if s.TotalActions >= 4 && s.TotalDenials > 0 {
		density := float64(s.TotalDenials) / float64(s.TotalActions)
		if density > 0.5 {
			s.Locked = true
			return SessionCheckResult{
				OK:      false,
				Reason:  "denial_density_lockdown",
				Message: fmt.Sprintf("denial density %.0f%% exceeds 50%% — session locked", density*100),
			}
		}
	}

	return SessionCheckResult{OK: true}
}

// Stats returns a snapshot of the session statistics.
func (s *SessionState) Stats() SessionStats {
	s.mu.Lock()
	defer s.mu.Unlock()
	return SessionStats{
		TotalActions:    s.TotalActions,
		TotalDenials:    s.TotalDenials,
		CumulativeBlast: s.CumulativeBlast,
		TokensUsed:      s.TokensUsed,
		Locked:          s.Locked,
	}
}

// SessionStats is a snapshot of session metrics.
type SessionStats struct {
	TotalActions    int     `json:"totalActions"`
	TotalDenials    int     `json:"totalDenials"`
	CumulativeBlast float64 `json:"cumulativeBlast"`
	TokensUsed      int     `json:"tokensUsed"`
	Locked          bool    `json:"locked"`
}
