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
        private static readonly ConcurrentDictionary<string, List<StreamWriter>> RoomMembers =
            new ConcurrentDictionary<string, List<StreamWriter>>();

        // GET api/rooms/5
        [HttpGet("{room}")]
        public async Task ListenToMessages(string room)
        {
            Response.Headers["Cache-Control"] = "no-cache"; // https://serverfault.com/a/801629
            Response.Headers["X-Accel-Buffering"] = "no";
            Response.ContentType = "text/event-stream";
            using (var member = new StreamWriter(Response.Body))
            {
                var members = RoomMembers.GetOrAdd(room, _ => new List<StreamWriter>(4));
                lock (members)
                    members.Add(member);
                await member.WriteAsync("event: connected\ndata:\n\n");
                await member.FlushAsync();

                try
                {
                    await Task.Delay(Timeout.Infinite, HttpContext.RequestAborted);
                }
                catch (TaskCanceledException)
                {
                }

                lock (members)
                    members.Remove(member);
            }
        }

        // POST api/rooms/5/messages
        [HttpPost("{room}/messages")]
        public async Task SendMessage(string room, [FromBody] string message)
        {
            if (!RoomMembers.TryGetValue(room, out var members))
                return;

            lock (members)
                members = members.ToList(); // copy to be thread safe

            async Task Send(StreamWriter member)
            {
                try
                {
                    await member.WriteAsync("data: " + message + "\n\n");
                    await member.FlushAsync();
                }
                catch (ObjectDisposedException)
                {
                    lock (members)
                        members.Remove(member);
                }
            }

            await Task.WhenAll(members.Select(Send));
        }
    }
}