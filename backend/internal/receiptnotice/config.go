package receiptnotice

import (
	"errors"
	"os"
	"strconv"
	"time"
)

// LoadSMTP loads deployment-owned settings, not tenant-controlled SMTP hosts.
func LoadSMTP() (*SMTPConfig, error) {
	if os.Getenv("PG08_NOTICE_ENABLED") != "true" {
		return nil, nil
	}
	port, err := strconv.Atoi(os.Getenv("PG08_SMTP_PORT"))
	if err != nil {
		return nil, errors.New("notice SMTP port required")
	}
	c := &SMTPConfig{Host: os.Getenv("PG08_SMTP_HOST"), Port: port, Username: os.Getenv("PG08_SMTP_USERNAME"), Password: os.Getenv("PG08_SMTP_PASSWORD"), From: os.Getenv("PG08_SMTP_FROM"), Timeout: 8 * time.Second}
	if c.Host == "" || c.Username == "" || c.Password == "" || port < 1 || port > 65535 {
		return nil, errors.New("notice SMTP configuration unavailable")
	}
	if _, err = NormalizeEmail(c.From); err != nil {
		return nil, errors.New("notice sender invalid")
	}
	return c, nil
}
