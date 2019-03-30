using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;

namespace Gaev.Chat.Controllers
{
    [Route("api/rooms")]
    public class RoomsController : ControllerBase
    {
        private static readonly ConcurrentDictionary<string, List<StreamWriter>> RoomClients =
            new ConcurrentDictionary<string, List<StreamWriter>>();

        // GET api/rooms/5
        [HttpGet("{id}")]
        public async Task ListenToMessages(string id)
        {
            Response.ContentType = "text/event-stream";
            using (var client = new StreamWriter(Response.Body))
            {
                var clients = RoomClients.GetOrAdd(id, _ => new List<StreamWriter>(4));
                lock (clients)
                    clients.Add(client);

                try
                {
                    await Task.Delay(Timeout.Infinite, HttpContext.RequestAborted);
                }
                catch (TaskCanceledException)
                {
                }

                lock (clients)
                    clients.Remove(client);
            }
        }

        // POST api/rooms/5/messages
        [HttpPost("{id}/messages")]
        public async Task SendMessage(string id, [FromBody] string message)
        {
            if (!RoomClients.TryGetValue(id, out var clients))
                return;

            lock (clients)
                clients = clients.ToList(); // copy to be thread safe

            async Task Send(StreamWriter client)
            {
                try
                {
                    await client.WriteAsync("data: " + message + "\n\n");
                    await client.FlushAsync();
                }
                catch (ObjectDisposedException)
                {
                    lock (clients)
                        clients.Remove(client);
                }
            }

            await Task.WhenAll(clients.Select(Send));
        }
    }
}