const fs = require('fs');
const path = require('path');

console.log('=== ЧИСТЫЙ И БЕЗОПАСНЫЙ ПАТЧЕР MAINMENU (БЕЗ РЕГУЛЯРОК) ===');

const menuPath = path.join(__dirname, 'src', 'components', 'MainMenu.tsx');

if (!fs.existsSync(menuPath)) {
  console.error(`[ОШИБКА] Файл не найден: ${menuPath}`);
  process.exit(1);
}

let menu = fs.readFileSync(menuPath, 'utf8');

// 1. Добавляем пропс в интерфейс
const targetInterface = 'onOpenRules: () => void;';
if (!menu.includes('onOpenDevPanel?: () => void;') && menu.includes(targetInterface)) {
  menu = menu.replace(targetInterface, `${targetInterface}\n  onOpenDevPanel?: () => void;`);
  console.log('[OK] onOpenDevPanel добавлен в интерфейс MainMenuProps.');
}

// 2. Деструктурируем пропс в параметрах компонента
const targetDestructure = 'onOpenRules,';
if (!menu.includes('onOpenDevPanel,') && menu.includes(targetDestructure)) {
  menu = menu.replace(targetDestructure, `${targetDestructure}\n  onOpenDevPanel,`);
  console.log('[OK] onOpenDevPanel деструктурирован в параметрах MainMenu.');
}

// 3. Делаем плашку баланса CR кликабельной (буквальная замена тега целиком)
const oldPill = '<div className="rounded-full bg-black/75 border border-white/10 px-3.5 py-1.5 flex items-center gap-1.5 shadow-lg">';
const newPill = '<div onClick={() => onOpenDevPanel?.()} className="rounded-full bg-black/75 border border-white/10 hover:border-amber-500/50 hover:bg-amber-950/20 px-3.5 py-1.5 flex items-center gap-1.5 shadow-lg cursor-pointer transition active:scale-95" title="Баланс / DEV">';

if (menu.includes(oldPill)) {
  menu = menu.replace(oldPill, newPill);
  console.log('[OK] Плашка баланса CR стала кликабельной для вызова DEV.');
}

// 4. Кнопка DEV в верхнем баре рядом с шестеренкой
const oldSettingsBtn = '<Icons.Settings />\n            </button>';
const newSettingsBtn = `<Icons.Settings />
            </button>
            {import.meta.env.DEV && onOpenDevPanel && (
              <button
                onClick={onOpenDevPanel}
                className="px-2.5 py-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/40 border border-amber-500/60 text-amber-300 font-mono font-black text-[10px] tracking-wider transition cursor-pointer active:scale-95 shadow-md ml-1"
                title="DEV панель"
              >
                DEV
              </button>
            )}`;

if (menu.includes(oldSettingsBtn) && !menu.includes('title="DEV панель"')) {
  menu = menu.replace(oldSettingsBtn, newSettingsBtn);
  console.log('[OK] Кнопка DEV добавлена в верхний бар рядом с шестеренкой.');
}

// 5. Кнопка DEV в профиле под прологом
const oldPrologue = '<span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Пройдено</span>\n          </div>\n        </div>';
const newPrologue = `<span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Пройдено</span>
          </div>
        </div>

        {import.meta.env.DEV && onOpenDevPanel && (
          <button
            onClick={onOpenDevPanel}
            className="w-full mt-4 py-3 rounded-2xl border border-amber-500/50 bg-amber-500/10 text-amber-400 font-mono text-xs font-black uppercase tracking-widest hover:bg-amber-500/20 active:scale-98 transition cursor-pointer flex items-center justify-center gap-2 shadow-lg"
          >
            <span>⚡ Панель разработчика (DEV)</span>
          </button>
        )}`;

if (menu.includes(oldPrologue) && !menu.includes('⚡ Панель разработчика (DEV)')) {
  menu = menu.replace(oldPrologue, newPrologue);
  console.log('[OK] Кнопка DEV добавлена в профиль под прологом.');
}

fs.writeFileSync(menuPath, menu, 'utf8');
console.log('=== УСПЕХ: MainMenu.tsx корректно пропатчен ===');