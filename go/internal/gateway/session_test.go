package gateway

import (
	"testing"
	"time"
)

func TestNewSessionState(t *testing.T) {
	cfg := SessionConfig{
		MaxBlastRadius:      50.0,
		MaxActionsPerMinute: 30,
		MaxDenials:          10,
		BudgetTokens:        100000,
	}
	s := NewSessionState(cfg)

	if s.TotalActions != 0 {
		t.Errorf("initial TotalActions = %d, want 0", s.TotalActions)
	}
	if s.TotalDenials != 0 {
		t.Errorf("initial TotalDenials = %d, want 0", s.TotalDenials)
	}
	if s.Locked {
		t.Error("session should not be locked initially")
	}
}

func TestSessionState_RecordAction(t *testing.T) {
	cfg := SessionConfig{
		MaxBlastRadius:      50.0,
		MaxActionsPerMinute: 100,
		MaxDenials:          10,
		BudgetTokens:        100000,
	}
	s := NewSessionState(cfg)

	s.RecordAction("fp1", 5.0, false)

	if s.TotalActions != 1 {
		t.Errorf("TotalActions = %d, want 1", s.TotalActions)
	}
	if s.CumulativeBlast != 5.0 {
		t.Errorf("CumulativeBlast = %f, want 5.0", s.CumulativeBlast)
	}
}

func TestSessionState_RecordDenial(t *testing.T) {
	cfg := SessionConfig{
		MaxBlastRadius:      50.0,
		MaxActionsPerMinute: 100,
		MaxDenials:          10,
		BudgetTokens:        100000,
	}
	s := NewSessionState(cfg)

	s.RecordDenial()

	if s.TotalDenials != 1 {
		t.Errorf("TotalDenials = %d, want 1", s.TotalDenials)
	}
}

func TestSessionState_RunawayDetection(t *testing.T) {
	cfg := SessionConfig{
		MaxBlastRadius:      50.0,
		MaxActionsPerMinute: 100,
		MaxDenials:          10,
		BudgetTokens:        100000,
	}
	s := NewSessionState(cfg)

	// Same fingerprint 3 times should trigger runaway
	fp := "same-fingerprint"
	s.RecordAction(fp, 1.0, false)
	s.RecordAction(fp, 1.0, false)
	s.RecordAction(fp, 1.0, false)

	result := s.CheckInvariants(fp)
	if result.OK {
		t.Error("expected runaway violation")
	}
	if result.Reason != "runaway" {
		t.Errorf("reason = %q, want runaway", result.Reason)
	}
}

func TestSessionState_BlastRadiusExceeded(t *testing.T) {
	cfg := SessionConfig{
		MaxBlastRadius:      10.0,
		MaxActionsPerMinute: 100,
		MaxDenials:          10,
		BudgetTokens:        100000,
	}
	s := NewSessionState(cfg)

	s.RecordAction("fp1", 11.0, false)

	result := s.CheckInvariants("fp2")
	if result.OK {
		t.Error("expected blast radius exceeded")
	}
	if result.Reason != "blast_radius_exceeded" {
		t.Errorf("reason = %q, want blast_radius_exceeded", result.Reason)
	}
}

func TestSessionState_VelocityThrottle(t *testing.T) {
	cfg := SessionConfig{
		MaxBlastRadius:      50.0,
		MaxActionsPerMinute: 3,
		MaxDenials:          10,
		BudgetTokens:        100000,
	}
	s := NewSessionState(cfg)

	now := time.Now()
	// Record 3 actions within last minute
	for i := 0; i < 3; i++ {
		s.recordActionAt("fp"+string(rune('a'+i)), 0.0, false, now)
	}

	result := s.checkInvariantsAt("fp-new", now)
	if result.OK {
		t.Error("expected velocity throttle")
	}
	if result.Reason != "velocity_exceeded" {
		t.Errorf("reason = %q, want velocity_exceeded", result.Reason)
	}
}

func TestSessionState_DenialDensityLockdown(t *testing.T) {
	cfg := SessionConfig{
		MaxBlastRadius:      50.0,
		MaxActionsPerMinute: 100,
		MaxDenials:          10,
		BudgetTokens:        100000,
	}
	s := NewSessionState(cfg)

	// 6 actions, 4 denials = 66% denial density (> 50%)
	// We need at least 4 total actions to trigger density check
	for i := 0; i < 6; i++ {
		s.RecordAction("fp"+string(rune('a'+i)), 0.0, false)
	}
	for i := 0; i < 4; i++ {
		s.RecordDenial()
	}

	result := s.CheckInvariants("fp-new")
	if result.OK {
		t.Error("expected denial density lockdown")
	}
	if result.Reason != "denial_density_lockdown" {
		t.Errorf("reason = %q, want denial_density_lockdown", result.Reason)
	}
}

func TestSessionState_BudgetExceeded(t *testing.T) {
	cfg := SessionConfig{
		MaxBlastRadius:      50.0,
		MaxActionsPerMinute: 100,
		MaxDenials:          10,
		BudgetTokens:        100,
	}
	s := NewSessionState(cfg)
	s.TokensUsed = 101

	result := s.CheckInvariants("fp-new")
	if result.OK {
		t.Error("expected budget exceeded")
	}
	if result.Reason != "budget_exceeded" {
		t.Errorf("reason = %q, want budget_exceeded", result.Reason)
	}
}

func TestSessionState_AllClear(t *testing.T) {
	cfg := SessionConfig{
		MaxBlastRadius:      50.0,
		MaxActionsPerMinute: 100,
		MaxDenials:          10,
		BudgetTokens:        100000,
	}
	s := NewSessionState(cfg)

	s.RecordAction("fp1", 5.0, false)

	result := s.CheckInvariants("fp2")
	if !result.OK {
		t.Errorf("expected OK, got reason=%q message=%q", result.Reason, result.Message)
	}
}

func TestSessionState_LockedSessionDenies(t *testing.T) {
	cfg := SessionConfig{
		MaxBlastRadius:      50.0,
		MaxActionsPerMinute: 100,
		MaxDenials:          10,
		BudgetTokens:        100000,
	}
	s := NewSessionState(cfg)
	s.Locked = true

	result := s.CheckInvariants("fp1")
	if result.OK {
		t.Error("locked session should deny all actions")
	}
	if result.Reason != "session_locked" {
		t.Errorf("reason = %q, want session_locked", result.Reason)
	}
}

func TestSessionState_MaxDenialsLockdown(t *testing.T) {
	cfg := SessionConfig{
		MaxBlastRadius:      50.0,
		MaxActionsPerMinute: 100,
		MaxDenials:          3,
		BudgetTokens:        100000,
	}
	s := NewSessionState(cfg)

	// Need enough total actions to avoid density check triggering first
	for i := 0; i < 10; i++ {
		s.RecordAction("fp"+string(rune('a'+i)), 0.0, false)
	}
	for i := 0; i < 3; i++ {
		s.RecordDenial()
	}

	result := s.CheckInvariants("fp-new")
	if result.OK {
		t.Error("expected max denials lockdown")
	}
	// Should be either denial_density_lockdown or max_denials_exceeded
	if result.Reason != "max_denials_exceeded" && result.Reason != "denial_density_lockdown" {
		t.Errorf("reason = %q, want max_denials_exceeded or denial_density_lockdown", result.Reason)
	}
}
