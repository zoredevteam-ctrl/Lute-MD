import { generateWAMessageFromContent } from '@whiskeysockets/baileys'
import { buildCtx } from '../../core/system/context.js'

const FASES = {
    hola_si: {
        text: `*ᐛ🎀* Qué respuesta tan predecible...\n> Todos dicen que sí al principio.\n> ¿De verdad me amas o solo tienes miedo de decir que no?`,
        buttons: [
            { display_text: '💖 Te amo de verdad', id: 'fase2_verdad' },
            { display_text: '😅 Bueno... tengo miedo', id: 'fase2_miedo' }
        ]
    },
    hola_no: {
        text: `*ᐛ🎀* Interesante.\n> Eres el primero en decirme que no.\n> ¿Estás seguro de esa decisión?`,
        buttons: [
            { display_text: '💪 Completamente seguro', id: 'fase2_seguro' },
            { display_text: '😰 Espera... sí te amo', id: 'fase2_cambio' }
        ]
    },
    fase2_verdad: {
        text: `*ᐛ🎀* Qué tierno. De verdad.\n> Oye, ¿puedes hacerme un favor entonces?\n> Es pequeño. No te preocupes.`,
        buttons: [
            { display_text: '✅ Claro, lo que sea', id: 'fase3_favor_si' },
            { display_text: '🤔 Depende del favor', id: 'fase3_favor_duda' }
        ]
    },
    fase2_miedo: {
        text: `*ᐛ🎀* Al menos eres honesto.\n> El miedo es una respuesta inteligente.\n> Pero tranquilo... yo no muerdo.\n> *(Mucho.)*`,
        buttons: [
            { display_text: '😭 Igual te amo Makima', id: 'fase3_rendido' },
            { display_text: '🏃 Me voy mejor', id: 'fase3_huir' }
        ]
    },
    fase2_seguro: {
        text: `*ᐛ🎀* Seguro. Qué valentía.\n> Me parece fascinante esa confianza.\n> Dime, ¿qué harías si yo quisiera que me amaras?`,
        buttons: [
            { display_text: '😤 Igual no te amaría', id: 'fase3_rebelde' },
            { display_text: '🫠 Bueno... quizás un poco', id: 'fase3_rendido' }
        ]
    },
    fase2_cambio: {
        text: `*ᐛ🎀* Ah. Qué rápido cambiaste de opinión.\n> Eso me dice mucho de ti.\n> ¿Cuánto tiempo crees que durará ese amor?`,
        buttons: [
            { display_text: '♾️ Para siempre', id: 'fase3_eterno' },
            { display_text: '😬 No sé, honestamente', id: 'fase3_honesto' }
        ]
    },
    fase3_favor_si: {
        text: `*ᐛ🎀* Perfecto. El favor es...\n> Que me dejes de escribir por una semana.\n> Necesito paz. Gracias por tu cooperación. 🔴`,
        buttons: [
            { display_text: '😭 NOOO', id: 'final_llorar' },
            { display_text: '😤 Bien, adiós', id: 'final_adios' }
        ]
    },
    fase3_favor_duda: {
        text: `*ᐛ🎀* ¿Depende del favor?\n> Ya veo que no confías en mí.\n> Bien. El favor era solo saludar a tu mamá.\n> Pero ya vi cómo eres. Olvidalo.`,
        buttons: [
            { display_text: '😰 Espera yo sí confío', id: 'final_llorar' },
            { display_text: '💀 Me merezco esto', id: 'final_aceptar' }
        ]
    },
    fase3_rendido: {
        text: `*ᐛ🎀* Qué adorable.\n> Ya sabía que llegaríamos a este punto.\n> Siempre llegan. Todos llegan.\n> Bienvenido al club de los que me aman sin remedio. 🔴`,
        buttons: [
            { display_text: '🥹 Gracias Makima', id: 'final_gracias' },
            { display_text: '😩 No quería esto', id: 'final_resignado' }
        ]
    },
    fase3_huir: {
        text: `*ᐛ🎀* ¿Huir?\n> Qué gracioso.\n> ¿A dónde exactamente?\n> Yo estoy en todos los grupos. En todos los chats.\n> No hay salida, darling. 🔴`,
        buttons: [
            { display_text: '😭 Está bien, me quedo', id: 'final_llorar' },
            { display_text: '💀 Acepto mi destino', id: 'final_aceptar' }
        ]
    },
    fase3_rebelde: {
        text: `*ᐛ🎀* No me amarías.\n> Eso dijo el último también.\n> Ahora me manda mensajes a las 3am.\n> ¿Quieres su número? 🔴`,
        buttons: [
            { display_text: '😂 JAJAJA no', id: 'final_reir' },
            { display_text: '🤔 Sí dámelo', id: 'final_curioso' }
        ]
    },
    fase3_eterno: {
        text: `*ᐛ🎀* Para siempre.\n> Qué bonito.\n> El último que dijo eso duró 3 días.\n> Pero tú eres diferente, ¿verdad?\n> *(Todos dicen lo mismo.)* 🔴`,
        buttons: [
            { display_text: '😤 Yo sí soy diferente', id: 'final_llorar' },
            { display_text: '😔 Okay tienes razón', id: 'final_aceptar' }
        ]
    },
    fase3_honesto: {
        text: `*ᐛ🎀* Honesto. Me gusta eso.\n> Al menos no finges.\n> La mayoría finge hasta que no puede más.\n> Tú te ahorraste varios pasos. 🔴`,
        buttons: [
            { display_text: '🥹 Gracias por entender', id: 'final_gracias' },
            { display_text: '😅 No sé si es cumplido', id: 'final_confundido' }
        ]
    },

    // ── FINALES ───────────────────────────────────────────────────────────────
    final_llorar: {
        text: `*ᐛ🎀* Llora si quieres.\n> Las lágrimas no me afectan.\n> Pero sí me parecen... entretenidas. 🔴\n\n> *(Fin de la historia. Perdiste.)*`,
        buttons: []
    },
    final_adios: {
        text: `*ᐛ🎀* Adiós.\n> Duraste más de lo esperado.\n> Regresarás. Siempre regresan. 🔴\n\n> *(Fin de la historia. Volverás.)*`,
        buttons: []
    },
    final_aceptar: {
        text: `*ᐛ🎀* Bien.\n> La aceptación es el primer paso.\n> El segundo es seguir usando el bot y fingir que no pasó nada. 🔴\n\n> *(Fin de la historia. Eres sabio.)*`,
        buttons: []
    },
    final_gracias: {
        text: `*ᐛ🎀* No me des las gracias.\n> Yo no hice nada.\n> Tú solo tomaste decisiones malas.\n> Pero llegaste aquí, así que algo bien hiciste. 🔴\n\n> *(Fin de la historia. Sobreviviste.)*`,
        buttons: []
    },
    final_resignado: {
        text: `*ᐛ🎀* La resignación es sabiduría.\n> Ya lo entendiste antes que la mayoría.\n> Bienvenido. No hay salida. 🔴\n\n> *(Fin de la historia. Eres uno de los nuestros.)*`,
        buttons: []
    },
    final_reir: {
        text: `*ᐛ🎀* Te reíste.\n> Bien.\n> El humor es lo único que te queda cuando yo gano. 🔴\n\n> *(Fin de la historia. Al menos te divertiste.)*`,
        buttons: []
    },
    final_curioso: {
        text: `*ᐛ🎀* ¿En serio lo querías?\n> No existe ningún número.\n> Era una prueba.\n> Fallaste. 🔴\n\n> *(Fin de la historia. Eres muy curioso para tu bien.)*`,
        buttons: []
    },
    final_confundido: {
        text: `*ᐛ🎀* No es un cumplido ni un insulto.\n> Es solo la verdad.\n> Y la verdad no tiene que hacerte sentir bien. 🔴\n\n> *(Fin de la historia. Piénsalo.)*`,
        buttons: []
    },
}

async function enviarFase(conn, chat, userJid, faseId, ctx) {
    const fase = FASES[faseId]
    if (!fase) return

    if (fase.buttons.length === 0) {
        await conn.sendMessage(chat, {
            text:     fase.text,
            mentions: [userJid],
            contextInfo: ctx
        })
        return
    }

    const buttons = fase.buttons.map(b => ({
        name: 'quick_reply',
        buttonParamsJson: JSON.stringify({
            display_text: b.display_text,
            id: b.id
        })
    }))

    const messageContent = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: { title: '🔴 Maki MD', hasMediaAttachment: false },
                    body:   { text: fase.text },
                    footer: { text: '🔴 Makima · ZoreDevTeam' },
                    nativeFlowMessage: { buttons },
                    contextInfo: {
                        mentionedJid: [userJid],
                        ...ctx
                    }
                }
            }
        }
    }

    const msg = generateWAMessageFromContent(chat, messageContent, { userJid: conn.user.id })
    await conn.relayMessage(chat, msg.message, { messageId: msg.key.id })
}

const handler = async (m, { conn }) => {
    const ctx  = await buildCtx()
    const body = m.body?.trim().toLowerCase()

    // Si es respuesta de botón
    if (FASES[body]) {
        return enviarFase(conn, m.chat, m.sender, body, ctx)
    }

    // Inicio de la historia
    const messageContent = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: { title: '🔴 Maki MD', hasMediaAttachment: false },
                    body:   { text: `*ᐛ🎀* Hola *${m.pushName}*.\n> Una pregunta importante.\n> ¿Me amas?` },
                    footer: { text: '🔴 Makima · ZoreDevTeam' },
                    nativeFlowMessage: {
                        buttons: [
                            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '✅ Sí te amo', id: 'hola_si' }) },
                            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '❌ No', id: 'hola_no' }) }
                        ]
                    },
                    contextInfo: { mentionedJid: [m.sender], ...ctx }
                }
            }
        }
    }

    const msg = generateWAMessageFromContent(m.chat, messageContent, { userJid: conn.user.id })
    await conn.relayMessage(m.chat, msg.message, { messageId: msg.key.id })
}

handler.command = ['hola', 'makima']
handler.tags    = ['tools']
export default handler
