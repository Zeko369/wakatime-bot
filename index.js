const { capitalize } = require("lodash");
const { readFile } = require("fs").promises;
const { default: got } = require("got");

const spaces = (num) => {
  return Array.from(new Array(num), () => " ").join("");
};

const fill = (n) => (n < 10 ? `0${n}` : n);
const formatTime = (t) => {
  t /= 60;
  return `${fill(Math.floor(t / 60))}:${fill(Math.floor(t % 60))}`;
};

(async () => {
  const file = await readFile(`${process.env.HOME}/.wakatime.cfg`, "utf-8");
  const rawApiKey = file.split("\n")[1].slice(8);
  const apiKey = Buffer.from(rawApiKey).toString("base64");

  const res = await got(
    "https://wakatime.com/api/v1/users/current/leaderboards/aa4bc0e5-7e49-430e-97b2-c0e0a662f4ba",
    { headers: { Authorization: `Basic ${apiKey}` } }
  );

  const data = JSON.parse(res.body);
  const range = data.range.text;

  const rows = [];
  rows.push(["ID", "Name", "Total", "Daily", "Languages", "Most used editors"]);
  const COLUMN_COUNT = rows[0].length;

  for (const row of data.data) {
    let data;
    try {
      const res = await got(`https://wakatime.com/api/v1/users/${row.user.id}/stats/last_7_days`, {
        headers: { Authorization: `Basic ${apiKey}` },
      });

      data = JSON.parse(res.body);
    } catch (err) {
      data = { data: { editors: undefined } };
    }

    rows.push([
      row.rank.toString(),
      row.user.display_name,
      formatTime(row.running_total.total_seconds),
      formatTime(row.running_total.daily_average),
      row.running_total.languages
        .slice(0, 3)
        .map((l) => l.name)
        .join(", "),
      (data.data.editors || [])
        .slice(0, 2)
        .map((e) => e.name)
        .join(", "),
    ]);
  }

  const outWidths = [];
  for (let i = 0; i < COLUMN_COUNT; i++) {
    let max = 0;
    rows.forEach((row) => {
      if (max < row[i].length) {
        max = row[i].length;
      }
    });

    outWidths.push(max);
  }

  let body = `${capitalize(range)}\n\`\`\``;
  for (const row of rows) {
    let output = "";
    for (let i = 0; i < COLUMN_COUNT; i++) {
      output += ` ${row[i]}${spaces(outWidths[i] - row[i].length)} `;
    }

    body += `\n${output}`;
  }
  body += "\n```";

  console.log(body);
})();
