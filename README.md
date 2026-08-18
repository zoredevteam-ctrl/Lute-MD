<div align="center">

<img src="https://i.pinimg.com/736x/30/7e/3f/307e3f2df6f4a735f659c6f28a4fc399.jpg" width="100%" style="border-radius:12px" alt="Makima Banner"/>

<br/><br/>

```
███╗   ███╗ █████╗ ██╗  ██╗██╗███╗   ███╗ █████╗
████╗ ████║██╔══██╗██║ ██╔╝██║████╗ ████║██╔══██╗
██╔████╔██║███████║█████╔╝ ██║██╔████╔██║███████║
██║╚██╔╝██║██╔══██║██╔═██╗ ██║██║╚██╔╝██║██╔══██║
██║ ╚═╝ ██║██║  ██║██║  ██╗██║██║ ╚═╝ ██║██║  ██║
╚═╝     ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚═╝  ╚═╝
```

### *"No necesito que me obedezcas. Solo necesito que no puedas hacer otra cosa."*

<br/>

[![WhatsApp](https://img.shields.io/badge/PLATAFORMA-WhatsApp-0a0a0a?style=for-the-badge&logo=whatsapp&logoColor=white&labelColor=8b0000)](https://whatsapp.com)
[![Baileys](https://img.shields.io/badge/LIBRERÍA-Baileys-0a0a0a?style=for-the-badge&logoColor=white&labelColor=8b0000)](https://github.com/WhiskeySockets/Baileys)
[![Node](https://img.shields.io/badge/Node.js-18%2B-0a0a0a?style=for-the-badge&logo=node.js&logoColor=white&labelColor=8b0000)](https://nodejs.org)
[![Estado](https://img.shields.io/badge/ESTADO-OPERACIONAL-0a0a0a?style=for-the-badge&labelColor=8b0000)](#)
[![ZoreDevTeam](https://img.shields.io/badge/BY-ZoreDevTeam-0a0a0a?style=for-the-badge&labelColor=8b0000)](#)

</div>

---

## ` 〔 BRIEFING 〕 `

**Makima MD** no es un asistente. Es un sistema de control.

Cada comando ejecutado, cada respuesta enviada, cada grupo moderado — todo ocurre dentro de un orden diseñado con precisión por **ZoreDevTeam**. No hay errores tolerados. No hay excepciones programadas. Solo resultados.

Basado en el personaje de **Makima** de *Chainsaw Man* (Tatsuki Fujimoto). El Control Devil en formato de bot de WhatsApp: manipuladora, calculadora y absolutamente inevitable.

---

## ` 〔 ARQUITECTURA 〕 `

```
makima-md/
│
├── 📁 cmds/                  # Comandos organizados por módulo
│   ├── main/                 # Core: menu, ping, registro
│   ├── economy/              # Sistema económico: bal, daily, work
│   ├── group/                # Administración: kick, promote, welcome
│   ├── fun/                  # Entretenimiento: ruleta, random
│   ├── owner/                # Control total: ban, restart, update
│   ├── downloads/            # Descargas: TikTok, YouTube, IG
│   ├── stickers/             # Conversión de stickers
│   └── utils/                # Herramientas: clima, traducir, calc
│
├── 📁 core/                  # Motor interno
│   ├── database.js           # JSON nativo — sin dependencias externas
│   ├── serialize.js          # Normalización de mensajes Baileys
│   ├── print.js              # Logger visual en consola
│   └── system/
│       ├── cmdsLoader.js     # Carga dinámica y hot-reload de comandos
│       └── context.js        # Constructor de contextInfo con newsletter
│
├── 📁 events/                # Eventos del socket
│   ├── welcome.js            # Bienvenida con foto de perfil
│   ├── promote-demote.js     # Detección de cambios de rango
│   └── anti-toxic.js        # Moderación automática
│
├── index.js                  # Punto de entrada y conexión
├── main.js                   # Handler central de comandos
└── settings.js               # Configuración global con hot-reload
```

---

## ` 〔 REQUISITOS 〕 `

| Componente | Versión mínima |
|---|---|
| Node.js | `18.x` o superior |
| npm | `8.x` o superior |
| ffmpeg | Recomendado para stickers |
| Sistema | Linux / Termux / VPS |

---

## ` 〔 INSTALACIÓN 〕 `

```bash
# 1. Clonar el repositorio
git clone https://github.com/zoredevteam-ctrl/makima-md
cd makima-md

# 2. Instalar dependencias
npm install

# 3. Configurar en settings.js
#    → global.owner, global.icon, global.newsletterJid

# 4. Iniciar
npm start          # sesión existente
node index.js --code   # vincular con código
node index.js --qr     # vincular con QR
```

Al iniciar por primera vez selecciona el método de vinculación. El código aparece en consola. No hay segunda vuelta.

---

## ` 〔 CONFIGURACIÓN RÁPIDA 〕 `

```js
// settings.js — los únicos valores que necesitas cambiar

global.owner = [
    ['57XXXXXXXXXX', 'TuNombre', true],
]

global.botName = 'Makima'
global.prefix  = '#'

global.icon   = 'https://tu-imagen.jpg'
global.banner = 'https://tu-imagen.jpg'

global.newsletterJid  = '120363408182996815@newsletter'
global.newsletterName = '🔴 𝐌𝐀𝐊𝐈𝐌𝐀'
```

Cada cambio en `settings.js` se aplica en tiempo real sin reiniciar. Hot-reload integrado.

---

## ` 〔 COMANDOS 〕 `

| Módulo | Comandos |
|---|---|
| **Main** | `#menu` `#ping` `#reg` `#owner` |
| **Economy** | `#bal` `#daily` `#work` `#crime` `#leaderboard` |
| **Grupos** | `#kick` `#promote` `#demote` `#tagall` `#antilink` |
| **Bienvenida** | `#welcome` `#goodbye` `#setwelcome` `#setgoodbye` |
| **Fun** | `#random` `#ruleta` `#medir` |
| **Owner** | `#ban` `#unban` `#restart` `#update` `#broadcast` |

---

## ` 〔 CARACTERÍSTICAS 〕 `

```
✦ Carga dinámica de comandos — sin reiniciar el bot
✦ Base de datos JSON nativa — compatible con Node.js v24+
✦ Cache de thumbnails — respuestas rápidas sin fetches repetidos
✦ Anti-duplicate de mensajes — sin ejecuciones dobles
✦ Cache de groupMetadata — reduce latencia en grupos
✦ Hot-reload de settings — cambios en vivo
✦ Eventos modulares — welcome, anti-toxic, promote/demote
✦ Sistema de XP y niveles integrado
✦ Newsletter de WhatsApp en cada respuesta
```

---

## ` 〔 STACK TÉCNICO 〕 `

```
Runtime      →  Node.js 18+
Protocol     →  @whiskeysockets/baileys
Database     →  JSON nativo (fs)
Logging      →  chalk + cfonts
Media        →  sharp + ffmpeg
Architecture →  ESModules (import/export)
```

---

## ` 〔 EQUIPO 〕 `

<div align="center">

| | Rol |
|:---:|:---:|
| **𝒜𝒶𝓇𝑜𝓂** | Arquitecto principal · Lead Developer |
| **ZoreDevTeam** | Infraestructura · QA · Deploy |

*Dos personas. Cero dependencia de frameworks externos innecesarios. Todo construido desde cero.*

</div>

---

## ` 〔 AVISO LEGAL 〕 `

Proyecto de fan no oficial, sin fines de lucro.

Makima y Chainsaw Man son propiedad de **Tatsuki Fujimoto**, **Shueisha** y **MAPPA**. Sin afiliación con los titulares originales.

El uso de librerías no oficiales de WhatsApp puede infringir sus Términos de Servicio. El usuario asume la responsabilidad total del uso.

---

<div align="center">

```
"Todos los que conozco terminan controlados o eliminados."
                                        — Makima
```

**ZoreDevTeam © 2025**

</div>
