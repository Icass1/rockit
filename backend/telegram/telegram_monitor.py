# telegram_monitor.py
"""
Telegram bot module (mock) — fixes de typing/Pylance.
Diseñado para Python 3.12 y python-telegram-bot >=20 (async).
Puede importarse y arrancarse como tarea asyncio desde tu FastAPI.
"""

from __future__ import annotations
import os
import asyncio
import logging
import random
from typing import Optional, Set

from telegram import Update
from telegram.ext import (
    Application,
    ApplicationBuilder,
    CommandHandler,
    ContextTypes,
)

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# --- Mock state ---
_connected_users: Set[int] = set()
_SERVICES = ["frontend", "backend", "database"]


def _mock_service_status() -> dict:
    def _mk(name: str):
        up = random.choice([True, True, True, False])
        return {
            "name": name,
            "status": "online" if up else "offline",
            "uptime": f"{random.randint(1,72)}h" if up else "0h",
            "cpu%": round(random.uniform(0.5, 45.0), 1),
            "mem%": round(random.uniform(1.0, 60.0), 1),
        }
    return {s: _mk(s) for s in _SERVICES}


async def _mock_restart_service(service: str) -> str:
    await asyncio.sleep(1.5)
    ok = random.choice([True, True, True, False])
    return "ok" if ok else "failed"


# --- Handlers con checks para evitar Optional access errors ---
async def start_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    # update.message puede ser None (p. ej. en ciertos tipos de updates), lo comprobamos.
    if update.message is None:
        logger.debug("start_handler: update.message is None")
        return
    await update.message.reply_text(
        "Hola 👋\nSoy el bot de Rockit.\n Hecho por NicoElRabo ;)\n"
        "Comandos: /status, /restart <servicio>, /connect, /disconnect, /who"
    )


async def status_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message is None:
        logger.debug("status_handler: update.message is None")
        return
    statuses = _mock_service_status()
    lines = ["Estado actual (mock):"]
    for s, info in statuses.items():
        lines.append(
            f"- {s}: {info['status']} | uptime: {info['uptime']} "
            f"| CPU: {info['cpu%']}% | MEM: {info['mem%']}%"
        )
    lines.append(f"\nUsuarios conectados (mock): {len(_connected_users)}")
    await update.message.reply_text("\n".join(lines))


async def restart_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message is None:
        logger.debug("restart_handler: update.message is None")
        return

    # context.args puede ser lista vacía, lo comprobamos.
    if not context.args:
        await update.message.reply_text("Uso: /restart <servicio>. Ej: /restart backend")
        return
    service = context.args[0].lower()
    if service not in _SERVICES:
        await update.message.reply_text(f"Servicio desconocido: {service}. Servicios válidos: {', '.join(_SERVICES)}")
        return
    await update.message.reply_text(f"Reiniciando {service} (mock)...")
    result = await _mock_restart_service(service)
    if result == "ok":
        await update.message.reply_text(f"{service} reiniciado correctamente (mock). ✅")
    else:
        await update.message.reply_text(f"Error al reiniciar {service} (mock). ❌")


async def connect_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message is None:
        logger.debug("connect_handler: update.message is None")
        return
    user = update.effective_user
    if user is None:
        await update.message.reply_text("No se pudo identificar al usuario (mock).")
        return
    _connected_users.add(user.id)
    await update.message.reply_text(f"Usuario {user.first_name} (id {user.id}) conectado (mock).")


async def disconnect_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message is None:
        logger.debug("disconnect_handler: update.message is None")
        return
    user = update.effective_user
    if user is None:
        await update.message.reply_text("No se pudo identificar al usuario (mock).")
        return
    _connected_users.discard(user.id)
    await update.message.reply_text(f"Usuario {user.first_name} (id {user.id}) desconectado (mock).")


async def who_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    if update.message is None:
        logger.debug("who_handler: update.message is None")
        return
    await update.message.reply_text(f"Usuarios conectados (mock): {len(_connected_users)}")


# --- Runner ---
class TelegramBotRunner:
    def __init__(self, token: str, admin_chat_id: Optional[int] = None, periodic_seconds: int = 300):
        self.token = token
        self.admin_chat_id = admin_chat_id
        self.periodic_seconds = periodic_seconds
        self.app: Optional[Application] = None
        self._main_loop_task: Optional[asyncio.Task] = None
        self._stop_event = asyncio.Event()

    def _register_handlers(self, app: Application):
        app.add_handler(CommandHandler("start", start_handler))
        app.add_handler(CommandHandler("status", status_handler))
        app.add_handler(CommandHandler("restart", restart_handler))
        app.add_handler(CommandHandler("connect", connect_handler))
        app.add_handler(CommandHandler("disconnect", disconnect_handler))
        app.add_handler(CommandHandler("who", who_handler))

    async def _periodic_worker(self):
        while not self._stop_event.is_set():
            await asyncio.sleep(self.periodic_seconds)
            summary = _mock_service_status()
            text_lines = ["Notificación periódica (mock):"]
            for s, info in summary.items():
                text_lines.append(f"{s}: {info['status']} (uptime {info['uptime']})")
            text_lines.append(f"Usuarios conectados (mock): {len(_connected_users)}")
            text = "\n".join(text_lines)

            # self.app puede ser None o self.app.bot puede ser None según estado -> comprobamos.
            if self.app is not None and getattr(self.app, "bot", None) is not None and self.admin_chat_id is not None:
                try:
                    # mypy/pylance ya entiende que app.bot no es None aquí por el getattr + comprobación
                    await self.app.bot.send_message(chat_id=self.admin_chat_id, text=text)
                    logger.info("Enviada notificación periódica al admin_chat_id.")
                except Exception as e:
                    logger.exception("Error enviando notificación periódica: %s", e)
            else:
                logger.debug("Periodic notification skipped (no admin_chat_id or bot not ready).")

    async def start(self):
        if not self.token:
            raise RuntimeError("No Telegram token provided.")

        self.app = ApplicationBuilder().token(self.token).build()
        self._register_handlers(self.app)

        await self.app.initialize()
        await self.app.start()

        # app.updater puede ser Optional — hacemos un guard.
        updater = getattr(self.app, "updater", None)
        if updater is not None:
            await updater.start_polling()
        else:
            logger.warning("Application.updater is None — skipping start_polling().")

        self._main_loop_task = asyncio.create_task(self._periodic_worker(), name="tg-periodic-worker")
        logger.info("Telegram bot started (mock mode).")

    async def stop(self):
        logger.info("Stopping telegram bot...")
        self._stop_event.set()
        if self._main_loop_task:
            try:
                await self._main_loop_task
            except asyncio.CancelledError:
                pass

        # Guard para evitar AttributeError si app es None
        if self.app is not None:
            updater = getattr(self.app, "updater", None)
            if updater is not None:
                try:
                    await updater.stop()
                except Exception:
                    logger.exception("Error stopping updater (ignored).")
            try:
                await self.app.stop()
                await self.app.shutdown()
            except Exception:
                logger.exception("Error stopping/shutting down application (ignored).")
        logger.info("Telegram bot stopped.")


async def telegram_bot_task(token: Optional[str] = None, admin_chat_id: Optional[int] = None, periodic_seconds: int = 300):
    # token safe get
    token = token or os.environ.get("TELEGRAM_BOT_TOKEN")
    if token is None:
        logger.error("No TELEGRAM_BOT_TOKEN provided; telegram_bot_task will not start.")
        return

    # Evitamos int(None) — comprobamos la variable de entorno antes de convertir.
    if admin_chat_id is None:
        env_admin = os.environ.get("TELEGRAM_ADMIN_CHAT_ID")
        admin_chat_id = int(env_admin) if env_admin is not None else None

    runner = TelegramBotRunner(token=token, admin_chat_id=admin_chat_id, periodic_seconds=periodic_seconds)

    try:
        await runner.start()
        # Mantener vivo hasta que se cancele
        await asyncio.Event().wait()
    except asyncio.CancelledError:
        logger.info("telegram_bot_task received cancellation.")
    finally:
        await runner.stop()
