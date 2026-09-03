package main

import (
	"encoding/json"
	"net/http"
)

func getAccountHistory(w http.ResponseWriter, r *http.Request) {

	response := map[string]interface{}{
		"account_id": 1,
		"balance":    25000,
		"message":    "API working",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}