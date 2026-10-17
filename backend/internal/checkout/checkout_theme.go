package checkout

import (
	"encoding/json"
	"errors"
	"net/mail"
	"strings"
)

// The merchant's persisted theme is the only authority for collecting details.
// These are customer contact fields, never payer identity or payment evidence.
func validateCheckoutCustomerDetails(brand map[string]string, details map[string]string) error {
	if len(details) == 0 {
		return nil
	}
	var config struct {
		Info   bool            `json:"info"`
		Fields map[string]bool `json:"f"`
	}
	if json.Unmarshal([]byte(brand["checkout_theme"]), &config) != nil || !config.Info {
		return errors.New("customer details disabled")
	}
	for key, value := range details {
		if !map[string]bool{"name": true, "email": true, "addr": true, "note": true}[key] || !config.Fields[key] || len(value) > 2000 || strings.ContainsRune(value, 0) {
			return errors.New("invalid customer detail")
		}
		if key == "email" && value != "" {
			address, err := mail.ParseAddress(value)
			if err != nil || address.Address != value {
				return errors.New("invalid contact email")
			}
		}
	}
	return nil
}
