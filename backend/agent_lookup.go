package main
import (
	"database/sql"
	"encoding/json"
	"net/http"
)
type CustomerLookupItem struct{
	AccountNo    string  `json:"account_no"`
	Balance      float64 `json:"balance"`
	CustomerName string  `json:"customer_name"`
}
func AgentCustomerLookupHandler(db *sql.DB) http.HandlerFunc{
	return func(w http.ResponseWriter, r *http.Request){
		accNo := r.URL.Query().Get("account_no")
		if accNo == "" {
			http.Error(w,"Missing account_no parameter", http.StatusBadRequest)
			return
		}
		query:= `
			SELECT s.account_no, s.balance, p.first_name 
			FROM PERSON p 
			JOIN ACCOUNT_HOLDER ah ON p.person_id = ah.person_id 
			JOIN SAVINGS_ACCOUNT s ON ah.account_no = s.account_no 
			WHERE s.account_no LIKE ?
		`
		rows,err := db.Query(query, accNo + "%")
		if err !=nil{
			http.Error(w,err.Error(), http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		var results[]CustomerLookupItem
		for rows.Next(){
			var item CustomerLookupItem
			if err :=rows.Scan(&item.AccountNo, &item.Balance, &item.CustomerName); err !=nil{
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			results = append(results,item)
		}
		if results==nil{
			results= []CustomerLookupItem{}
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(results)
	}
}
