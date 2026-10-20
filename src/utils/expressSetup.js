/**
 * El filtro `/api/comercios/filter` valida que `name` y `sector` sean texto y responde 400 si llegan
 * como array u objeto (`?name[]=x`, `?sector[a]=1`). Eso depende del parseador de query "extended"
 * (qs), que es el de Express 4 pero NO el de Express 5 (usa "simple" y ignoraría esa sintaxis).
 * Se fija explícitamente para que el comportamiento no cambie al actualizar Express.
 */
function configureQueryParser(app) {
  app.set("query parser", "extended");
}

module.exports = { configureQueryParser };
