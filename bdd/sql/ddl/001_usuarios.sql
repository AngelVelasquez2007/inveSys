CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    correo VARCHAR(255) NOT NULL UNIQUE,
    contrasena_hash VARCHAR(255) NOT NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'OPERADOR'
        CHECK (rol IN ('ADMIN', 'OPERADOR')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_correo ON usuarios(correo);
