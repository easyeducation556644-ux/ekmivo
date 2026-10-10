package main

import (
	"log"
	"os"
)

func main() {
	if os.Getenv("DATABASE_URL") == "" {
		log.Fatal("DATABASE_URL is required before starting a worker")
	}
	log.Fatal("worker jobs have not been implemented")
}
