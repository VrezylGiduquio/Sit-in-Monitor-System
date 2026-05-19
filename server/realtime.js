const leaderboardClients = new Set();

function addLeaderboardClient(res) {
  leaderboardClients.add(res);

  const keepAlive = setInterval(() => {
    res.write(": keep-alive\n\n");
  }, 25000);

  res.on("close", () => {
    clearInterval(keepAlive);
    leaderboardClients.delete(res);
  });
}

function emitLeaderboardChanged(reason = "updated") {
  const payload = JSON.stringify({ reason, timestamp: Date.now() });

  leaderboardClients.forEach((res) => {
    res.write(`event: leaderboard-changed\n`);
    res.write(`data: ${payload}\n\n`);
  });
}

module.exports = {
  addLeaderboardClient,
  emitLeaderboardChanged
};
