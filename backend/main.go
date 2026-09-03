package main

import (
    "fmt"
    "log"
    "net/http"
)

func homePage(w http.ResponseWriter, r *http.Request) {
    fmt.Fprintf(w, "B-Trust Backend is running!")
}

func main() {
    http.HandleFunc("/", homePage)
    http.HandleFunc("/api/account/history", getAccountHistory)
    fmt.Println("Server starting on port 8080...")
    log.Fatal(http.ListenAndServe(":8080", nil))
}