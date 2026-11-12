FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    POETRY_VERSION=2.4.3 \
    POETRY_VIRTUALENVS_CREATE=false \
    POETRY_NO_INTERACTION=1

WORKDIR /app

RUN pip install "poetry==${POETRY_VERSION}"

# Instalar dependencias primero para aprovechar la caché de capas
COPY pyproject.toml poetry.lock ./
ARG INSTALL_DEV=false
RUN if [ "$INSTALL_DEV" = "true" ]; then poetry install --no-root; \
    else poetry install --no-root --only main; fi

COPY . .
# El entrypoint vive fuera de /app para que el volumen de desarrollo no lo reemplace.
# Se quitan los CR por si el repo se clonó en Windows con finales CRLF.
RUN sed 's/\r$//' scripts/entrypoint.sh > /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 8000
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
