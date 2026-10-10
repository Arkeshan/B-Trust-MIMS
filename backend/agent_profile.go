package main
import (
	"database/sql"
	"encoding/json"
	"net/http"
)
// AgentProfileHandler returns the logged in agent's profile information(name, role, and the branch they are assigned to)
func AgentProfileHandler(db *sql.DB) http.HandlerFunc{
	return func(w http.ResponseWriter, r *http.Request){
		if r.Method != http.MethodGet{
			writeFDError(w, http.StatusMethodNotAllowed, "method not allowed")
			return
		}
		agentPersonID, err :=getStaffPersonID(r, db)
		if err != nil{
			writeFDError(w, http.StatusForbidden, "forbidden: agent access required")
			return
		}
		var firstName, lastName, role, branchName, branchAddress string
		err= db.QueryRowContext(r.Context(), `
			SELECT
				p.first_name,
				p.last_name,
				s.role,
				b.branch_name,
				b.address
			FROM STAFF s
			JOIN PERSON p ON p.person_id = s.person_id
			JOIN BRANCH b ON b.branch_id = s.branch_id
			WHERE s.person_id = ?`,
			agentPersonID,
		).Scan(&firstName, &lastName,&role, &branchName, &branchAddress)
		if err != nil {
			writeFDError(w, http.StatusInternalServerError,"could not fetch agent profile")
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]any{
			"first_name":     firstName,
			"last_name":      lastName,
			"role":           role,
			"branch_name":    branchName,
			"branch_address": branchAddress,
		})
	}
}
