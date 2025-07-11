# Usar la imagen oficial de Deno
FROM denoland/deno:alpine-2.3.6

# Establecer el directorio de trabajo
WORKDIR /app

# Variables de entorno (debe ir antes de cualquier comando Deno)
ENV PORT=8000
ENV MONGODB_URI=""
ENV NODE_ENV=production
ENV DENO_DIR=/app/.deno_cache

# Copiar todo el proyecto (incluye deps.ts)
COPY . .

# Crear directorio para la caché de Deno y dar permisos al usuario deno
RUN mkdir -p /app/.deno_cache && chown deno:deno /app/.deno_cache

# Usar el caché correcto al hacer deno cache
RUN DENO_DIR=/app/.deno_cache deno cache deps.ts

# Exponer el puerto
EXPOSE 8000

# Ejecutar como usuario no-root por seguridad
USER deno

# Comando para ejecutar el servidor con debugging
CMD ["sh", "-c", "echo '=== DEBUGGING CONTAINER ===' && echo 'PWD:' && pwd && echo 'LS /app:' && ls -la /app && echo 'LS /app/server:' && ls -la /app/server 2>/dev/null || echo 'NO /app/server directory' && echo 'FIND server/main.ts:' && find /app -name 'main.ts' 2>/dev/null || echo 'main.ts not found' && echo 'RUNNING DENO:' && deno run -A server/main.ts"]
