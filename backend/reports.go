package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
)

var reportViews = map[string]string{
	"agents":           "vw_agent_transaction_summary",
	"accounts":         "vw_account_transaction_summary",
	"fds":              "vw_active_fd_payouts",
	"monthly-interest": "vw_monthly_interest_by_account_type",
	"customers":        "vw_customer_activity",
}

func ReportsHandler(db *sql.DB) http.HandlerFunc {
	return func(response http.ResponseWriter, request *http.Request) {
		if request.Method != http.MethodGet {
			writeReportError(response, http.StatusMethodNotAllowed, "method not allowed")
			return
		}

		reportType := reportTypeFromPath(request.URL.Path)
		if reportType == "" {
			writeReportError(response, http.StatusBadRequest, "report type is required")
			return
		}

		viewName, ok := reportViews[reportType]
		if !ok {
			writeReportError(response, http.StatusNotFound, "unknown report type")
			return
		}

		rows, err := db.QueryContext(request.Context(), "SELECT * FROM "+viewName)
		if err != nil {
			fmt.Println("SQL Error:", err)
			writeReportError(response, http.StatusInternalServerError, "could not fetch report")
			return
		}
		defer rows.Close()

		data, err := rowsToMaps(rows)
		if err != nil {
			writeReportError(response, http.StatusInternalServerError, "could not read report")
			return
		}

		response.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(response).Encode(map[string]interface{}{
			"report": reportType,
			"data":   data,
		}); err != nil {
			return
		}
	}
}

func reportTypeFromPath(path string) string {
	const prefix = "/api/reports/"
	if !strings.HasPrefix(path, prefix) {
		return ""
	}
	return strings.Trim(strings.TrimPrefix(path, prefix), "/")
}

func rowsToMaps(rows *sql.Rows) ([]map[string]interface{}, error) {
	columns, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	results := make([]map[string]interface{}, 0)

	for rows.Next() {
		values := make([]interface{}, len(columns))
		pointers := make([]interface{}, len(columns))
		for i := range values {
			pointers[i] = &values[i]
		}

		if err := rows.Scan(pointers...); err != nil {
			return nil, err
		}

		rowMap := make(map[string]interface{}, len(columns))
		for i, col := range columns {

			if b, isBytes := values[i].([]byte); isBytes {
				rowMap[col] = string(b)
			} else {
				rowMap[col] = values[i]
			}
		}
		results = append(results, rowMap)
	}

	return results, rows.Err()
}

func writeReportError(response http.ResponseWriter, status int, message string) {
	response.Header().Set("Content-Type", "application/json")
	response.WriteHeader(status)
	_ = json.NewEncoder(response).Encode(map[string]string{"error": message})
}
