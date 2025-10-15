package server

import (
    "encoding/json"
    "fmt"
    "net/http"
    "strings"
    "time"

    "github.com/gofiber/fiber/v2"
    "github.com/gofiber/fiber/v2/middleware/cors"
    "github.com/jmoiron/sqlx"
)

type Options struct { AllowedOrigins, CoreAPIBase string; DB *sqlx.DB }

type Document struct {
    ID        string          `db:"id" json:"id"`
    UserID    string          `db:"user_id" json:"userId"`
    Title     *string         `db:"title" json:"title,omitempty"`
    Content   *string         `db:"content" json:"content,omitempty"`
    Status    string          `db:"status" json:"status"`
    CreatedAt time.Time       `db:"created_at" json:"createdAt"`
    UpdatedAt time.Time       `db:"updated_at" json:"updatedAt"`
}

func New(opts Options) *fiber.App {
    app := fiber.New()
    app.Use(cors.New(cors.Config{ AllowOrigins: opts.AllowedOrigins, AllowMethods: "GET,POST,PUT,PATCH,DELETE,OPTIONS", AllowHeaders: "Authorization,Content-Type,Accept", AllowCredentials: true }))

    app.Get("/v1/health", func(c *fiber.Ctx) error { return c.JSON(fiber.Map{"success": true}) })

    getUID := func(c *fiber.Ctx) (string, error) {
        req, _ := http.NewRequest("GET", strings.TrimRight(opts.CoreAPIBase, "/")+"/v1/auth/verify", nil)
        if v := c.Get("Authorization"); v != "" { req.Header.Set("Authorization", v) }
        if v := c.Get("Cookie"); v != "" { req.Header.Set("Cookie", v) }
        client := &http.Client{ Timeout: 3 * time.Second }
        resp, err := client.Do(req); if err != nil { return "", err }
        defer resp.Body.Close()
        var raw map[string]any
        if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil { return "", err }
        data, _ := raw["data"].(map[string]any); if data == nil { return "", fiber.ErrUnauthorized }
        if ok, _ := data["valid"].(bool); !ok { return "", fiber.ErrUnauthorized }
        if uidAny, ok := data["uid"]; ok {
            switch v := uidAny.(type) { case float64: return fmt.Sprintf("%0.0f", v), nil; case string: return v, nil }
        }
        if s, ok := data["userId"].(string); ok && s != "" { return s, nil }
        return "", fiber.ErrUnauthorized
    }

    // List
    app.Get("/v1/docs", func(c *fiber.Ctx) error {
        if opts.DB == nil { return c.Status(500).JSON(fiber.Map{"success": false}) }
        uid, err := getUID(c); if err != nil { return c.Status(401).JSON(fiber.Map{"success": false}) }
        statuses := c.Query("status", "active")
        q := `SELECT id, user_id, title, content, status, created_at, updated_at FROM documents
              WHERE user_id=$1 AND status = ANY(string_to_array($2, ','))
              ORDER BY updated_at DESC`
        out := []Document{}
        if err := opts.DB.Select(&out, q, uid, statuses); err != nil {
            return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
        }
        return c.JSON(fiber.Map{"success": true, "data": out})
    })

    // Get
    app.Get("/v1/docs/:id", func(c *fiber.Ctx) error {
        if opts.DB == nil { return c.Status(500).JSON(fiber.Map{"success": false}) }
        uid, err := getUID(c); if err != nil { return c.Status(401).JSON(fiber.Map{"success": false}) }
        id := c.Params("id"); var d Document
        if err := opts.DB.Get(&d, `SELECT id, user_id, title, content, status, created_at, updated_at FROM documents WHERE id=$1 AND user_id=$2`, id, uid); err != nil {
            return c.Status(404).JSON(fiber.Map{"success": false, "message": err.Error()})
        }
        return c.JSON(fiber.Map{"success": true, "data": d})
    })

    type docIn struct { Title *string `json:"title"`; Content *string `json:"content"`; Status *string `json:"status"` }

    // Create
    app.Post("/v1/docs", func(c *fiber.Ctx) error {
        if opts.DB == nil { return c.Status(500).JSON(fiber.Map{"success": false}) }
        uid, err := getUID(c); if err != nil { return c.Status(401).JSON(fiber.Map{"success": false}) }
        var in docIn; if err := c.BodyParser(&in); err != nil { return c.Status(400).JSON(fiber.Map{"success": false}) }
        hasTitle := in.Title != nil && strings.TrimSpace(*in.Title) != ""
        hasContent := in.Content != nil && strings.TrimSpace(stripHTML(*in.Content)) != ""
        if !hasTitle && !hasContent { return c.Status(400).JSON(fiber.Map{"success": false, "message": "empty"}) }
        var d Document
        if err := opts.DB.Get(&d, `INSERT INTO documents (user_id, title, content, status)
            VALUES ($1, NULLIF($2,''), NULLIF($3,''), COALESCE(NULLIF($4,''),'active'))
            RETURNING id, user_id, title, content, status, created_at, updated_at`, uid, optStr(in.Title), optStr(in.Content), optStr(in.Status)); err != nil {
            return c.Status(500).JSON(fiber.Map{"success": false, "message": err.Error()})
        }
        return c.JSON(fiber.Map{"success": true, "data": d})
    })

    // Update
    app.Put("/v1/docs/:id", func(c *fiber.Ctx) error {
        if opts.DB == nil { return c.Status(500).JSON(fiber.Map{"success": false}) }
        uid, err := getUID(c); if err != nil { return c.Status(401).JSON(fiber.Map{"success": false}) }
        id := c.Params("id")
        var in docIn; if err := c.BodyParser(&in); err != nil { return c.Status(400).JSON(fiber.Map{"success": false}) }
        var d Document
        if err := opts.DB.Get(&d, `UPDATE documents SET
            title = NULLIF($1,''), content = NULLIF($2,''), status = COALESCE(NULLIF($3,''), status), updated_at = now()
            WHERE id=$4 AND user_id=$5
            RETURNING id, user_id, title, content, status, created_at, updated_at`, optStr(in.Title), optStr(in.Content), optStr(in.Status), id, uid); err != nil {
            return c.Status(404).JSON(fiber.Map{"success": false, "message": err.Error()})
        }
        return c.JSON(fiber.Map{"success": true, "data": d})
    })

    // Status changes
    app.Post("/v1/docs/:id/archive", func(c *fiber.Ctx) error { return setStatus(opts, c, "archived") })
    app.Post("/v1/docs/:id/restore", func(c *fiber.Ctx) error { return setStatus(opts, c, "active") })
    app.Delete("/v1/docs/:id", func(c *fiber.Ctx) error { return setStatus(opts, c, "deleted") })

    return app
}

func setStatus(opts Options, c *fiber.Ctx, status string) error {
    if opts.DB == nil { return c.Status(500).JSON(fiber.Map{"success": false}) }
    uid, err := func() (string, error) {
        req, _ := http.NewRequest("GET", strings.TrimRight(opts.CoreAPIBase, "/")+"/v1/auth/verify", nil)
        if v := c.Get("Authorization"); v != "" { req.Header.Set("Authorization", v) }
        if v := c.Get("Cookie"); v != "" { req.Header.Set("Cookie", v) }
        client := &http.Client{ Timeout: 3 * time.Second }
        resp, err := client.Do(req); if err != nil { return "", err }
        defer resp.Body.Close()
        var raw map[string]any
        if err := json.NewDecoder(resp.Body).Decode(&raw); err != nil { return "", err }
        data, _ := raw["data"].(map[string]any)
        if data == nil { return "", fiber.ErrUnauthorized }
        valid, _ := data["valid"].(bool)
        if !valid { return "", fiber.ErrUnauthorized }
        if uidAny, ok := data["uid"]; ok { switch v := uidAny.(type) { case float64: return fmt.Sprintf("%0.0f", v), nil; case string: return v, nil } }
        if s, ok := data["userId"].(string); ok && s != "" { return s, nil }
        return "", fiber.ErrUnauthorized
    }()
    if err != nil { return c.Status(401).JSON(fiber.Map{"success": false}) }
    id := c.Params("id")
    var d Document
    if err := opts.DB.Get(&d, `UPDATE documents SET status=$1, updated_at=now() WHERE id=$2 AND user_id=$3
        RETURNING id, user_id, title, content, status, created_at, updated_at`, status, id, uid); err != nil {
        return c.Status(404).JSON(fiber.Map{"success": false, "message": err.Error()})
    }
    return c.JSON(fiber.Map{"success": true, "data": d})
}

func stripHTML(s string) string {
    out := make([]rune, 0, len(s))
    inTag := false
    for _, r := range s {
        switch r {
        case '<': inTag = true
        case '>': inTag = false
        default: if !inTag { out = append(out, r) }
        }
    }
    return strings.TrimSpace(string(out))
}
func optStr(p *string) string { if p == nil { return "" }; return *p }
