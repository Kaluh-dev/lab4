import { Command } from 'commander';
import http from 'node:http';
import fs from 'node:fs';

const program = new Command();

// -h зайнято під --host, тому стандартну довідку лишаємо лише як --help
program
  .name('weather-server')
  .description('HTTP-сервер, який віддає дані погоди у форматі JSON')
  .version('1.0.0')
  .helpOption('--help', 'показати довідку')
  .requiredOption('-i, --input <path>', 'шлях до файлу даних')
  .requiredOption('-h, --host <address>', 'адреса сервера')
  .requiredOption('-p, --port <number>', 'порт сервера')
  .option('-o, --output <path>', 'файл, у який записується остання відповідь');

program.parse();
const options = program.opts();

function fatal(message) {
  console.error(message);
  process.exit(1);
}

const port = Number(options.port);
if (!Number.isInteger(port) || port < 0 || port > 65535) {
  fatal('Порт має бути цілим числом від 0 до 65535');
}

// Перетворює значення з файлу на число; усе, що числом не є, дає null
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function reply(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function buildResult(records, showHumidity, minRainfall) {
  const result = [];
  for (const record of records) {
    const rainfall = toNumber(record.Rainfall);
    // Фільтр увімкнено: запис без числового Rainfall не можна порівняти, тому його пропускаємо
    if (minRainfall !== null && !(rainfall !== null && rainfall > minRainfall)) continue;
    const item = {
      rainfall,
      pressure3pm: toNumber(record.Pressure3pm),
    };
    if (showHumidity) item.humidity = toNumber(record.Humidity3pm);
    result.push(item);
  }
  return result;
}

function handleRequest(req, res) {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname !== '/') {
    reply(res, 404, { error: 'Маршрут не знайдено' });
    return;
  }

  const showHumidity = url.searchParams.get('humidity') === 'true';

  let minRainfall = null;
  const rawMin = url.searchParams.get('min_rainfall');
  if (rawMin !== null) {
    minRainfall = toNumber(rawMin);
    if (minRainfall === null) {
      reply(res, 400, { error: 'Параметр min_rainfall має бути числом' });
      return;
    }
  }

  fs.readFile(options.input, 'utf8', (err, text) => {
    if (err) {
      reply(res, 500, { error: 'Не вдалося прочитати файл даних' });
      return;
    }
    let records;
    try {
      records = JSON.parse(text);
    } catch (e) {
      reply(res, 500, { error: 'Файл даних пошкоджено: некоректний JSON' });
      return;
    }
    if (!Array.isArray(records)) {
      reply(res, 500, { error: 'Файл даних має містити JSON-масив' });
      return;
    }
    reply(res, 200, buildResult(records, showHumidity, minRainfall));
  });
}

const server = http.createServer((req, res) => {
  try {
    handleRequest(req, res);
  } catch (e) {
    reply(res, 500, { error: 'Внутрішня помилка сервера' });
  }
});

server.on('error', (err) => {
  fatal(`Не вдалося запустити сервер: ${err.message}`);
});

// Перевірка існування вхідного файлу (колбек-API); лише потім запуск сервера
fs.access(options.input, (err) => {
  if (err) fatal('Cannot find input file');
  server.listen(port, options.host, () => {
    console.log(`Сервер запущено: http://${options.host}:${port}/`);
  });
});
