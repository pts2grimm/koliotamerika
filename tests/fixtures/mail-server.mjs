// Local-only SMTP sink for password recovery tests. It never delivers mail.
import { createServer } from 'node:net'
export const messages = []
createServer(socket => {
 socket.setEncoding('utf8'); socket.write('220 localhost ESMTP test\r\n')
 let buffer = '', data = false, message = '', recipient = ''
 socket.on('data', chunk => {
  buffer += chunk
  while (buffer.includes('\r\n')) {
   const index = buffer.indexOf('\r\n'), line = buffer.slice(0, index); buffer = buffer.slice(index + 2)
   if (data) { if (line === '.') { messages.push({ recipient, message }); data = false; message = ''; socket.write('250 queued\r\n') } else message += line + '\r\n'; continue }
   if (/^EHLO|^HELO/i.test(line)) socket.write('250 localhost\r\n')
   else if (/^RCPT TO:/i.test(line)) { recipient = line.slice(8).trim(); socket.write('250 OK\r\n') }
   else if (/^DATA/i.test(line)) { data = true; socket.write('354 End with dot\r\n') }
   else if (/^QUIT/i.test(line)) socket.end('221 Bye\r\n')
   else socket.write('250 OK\r\n')
  }
 })
 socket.on('error', () => {})
}).listen(2525, '127.0.0.1')
