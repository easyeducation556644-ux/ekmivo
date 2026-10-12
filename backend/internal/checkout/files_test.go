package checkout

import (
	"net/http"
	"testing"
)

func TestUploadFilename(t *testing.T) {
	for _, tc := range []struct{ raw, encoding, want string }{
		{"%E0%A6%AC%E0%A6%BF%E0%A6%B2.pdf", "uri-component", "বিল.pdf"},
		{"folder\\invoice.pdf", "plain", "invoice.pdf"},
		{"%ZZ", "uri-component", "attachment"},
		{"bad%0D%0Aname", "uri-component", "attachment"},
		{"100%25.pdf", "uri-component", "100%.pdf"},
	} {
		h := http.Header{}
		h.Set("X-Filename", tc.raw)
		h.Set("X-Filename-Encoding", tc.encoding)
		if got := uploadFilename(h); got != tc.want {
			t.Errorf("got %q want %q", got, tc.want)
		}
	}
}
