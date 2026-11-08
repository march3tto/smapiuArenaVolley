-- Consenso esplicito all'invio delle domande dell'assistente a Groq Inc. (Stati Uniti), richiesto prima del primo uso
-- (App Store 5.1.2: dire a chi vanno i dati e ottenere il permesso prima di condividerli con un servizio AI di terzi).
-- Stesso registro append-only degli altri consensi: la revoca è una nuova riga con concesso = false.
-- La funzione assistente risponde solo se l'ultimo consenso assistente_ai dell'utente è concesso = true.

alter type public.tipo_consenso add value if not exists 'assistente_ai';
