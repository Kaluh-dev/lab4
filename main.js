import { Command } from 'commander';
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

// Перевірка існування вхідного файлу (колбек-API)
fs.access(options.input, (err) => {
  if (err) fatal('Cannot find input file');
  console.log(`Параметри прийнято: ${options.host}:${port}, файл ${options.input}`);
});
