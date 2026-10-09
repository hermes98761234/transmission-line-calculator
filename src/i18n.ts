import type { LineType } from './lib/analyze.ts'
import type { Lang } from './state.ts'

export type T = (s: string, ...args: (string | number)[]) => string

/** Marks a string for translation where it is defined away from its t() call. */
export const N = (s: string) => s

export const LINE_NAME: Record<LineType, string> = {
  microstrip: N('Microstrip'),
  stripline: N('Stripline (symmetric)'),
  cpw: N('Coplanar waveguide'),
  cpwg: N('Coplanar waveguide with ground'),
  coupled: N('Edge-coupled microstrip'),
  coax: N('Coaxial line'),
}

/** Messages produced by src/lib (which has no access to the dictionary). */
export const LIB_MESSAGES = [
  N('Width/height is outside 0.05 to 20: accuracy drops.'),
  N('Coupled-line model is fitted for w/h and s/h between 0.1 and 10.'),
  N('Stripline thickness above 25% of the spacing is outside the model range.'),
  N('Permittivity above 18 is outside the model range.'),
  N('Frequency is high for this substrate height: higher-order modes may appear.'),
]

/** English source string → Ukrainian. `{0}`, `{1}` are placeholders for interpolated values. */
export const UK: Record<string, string> = {
  'Transmission line calculator': 'Калькулятор лінії передачі',
  'Impedance, delay and loss of microstrip, stripline, CPW and coax.': 'Імпеданс, затримка та втрати мікросмужкової, смужкової, копланарної ліній і коаксіала.',
  'Closed-form models: expect a few percent. Verify critical designs with a field solver.':
    'Замкнені формули дають похибку в кілька відсотків. Відповідальні конструкції перевіряйте польовим розв’язувачем.',
  'Source on GitHub': 'Код на GitHub',
  Settings: 'Налаштування',
  Units: 'Одиниці',
  Language: 'Мова',
  Theme: 'Тема',
  System: 'Системна',
  Light: 'Світла',
  Dark: 'Темна',
  Microstrip: 'Мікросмужкова лінія',
  'Stripline (symmetric)': 'Смужкова лінія (симетрична)',
  'Coplanar waveguide': 'Копланарний хвилевід',
  'Coplanar waveguide with ground': 'Копланарний хвилевід із землею',
  'Edge-coupled microstrip': 'Зв’язані мікросмужкові лінії',
  'Coaxial line': 'Коаксіальна лінія',
  'Line type': 'Тип лінії',
  Mode: 'Режим',
  Analyze: 'Аналіз',
  Synthesize: 'Синтез',
  'Geometry to impedance': 'Геометрія → імпеданс',
  'Impedance to width': 'Імпеданс → ширина',
  Substrate: 'Підкладка',
  Preset: 'Шаблон',
  Custom: 'Власний',
  'Relative permittivity εr': 'Відносна діелектрична проникність εr',
  'Loss tangent tan δ': 'Тангенс кутів втрат tg δ',
  Geometry: 'Геометрія',
  'Trace width': 'Ширина провідника',
  'Substrate height': 'Висота підкладки',
  'Ground plane spacing': 'Відстань між площинами землі',
  'Copper thickness': 'Товщина міді',
  'Centre conductor width': 'Ширина центрального провідника',
  'Gap to ground': 'Зазор до землі',
  'Spacing between traces': 'Відстань між провідниками',
  'Inner conductor diameter': 'Діаметр внутрішнього провідника',
  'Outer conductor inner diameter': 'Внутрішній діаметр зовнішнього провідника',
  'Solved from the target impedance': 'Обчислено за цільовим імпедансом',
  'Copper weight': 'Вага міді',
  'Surface roughness (RMS)': 'Шорсткість поверхні (СКЗ)',
  'Frequency (GHz)': 'Частота (ГГц)',
  'Target impedance': 'Цільовий імпеданс',
  'Target differential impedance': 'Цільовий диференціальний імпеданс',
  Result: 'Результат',
  'Fix the highlighted fields.': 'Виправте виділені поля.',
  'Required trace width': 'Потрібна ширина провідника',
  'Required inner conductor diameter': 'Потрібний діаметр внутрішнього провідника',
  'Use this value in Analyze': 'Використати в режимі аналізу',
  'The width is solved for the low-frequency impedance; dispersion shifts Z0 slightly at high frequency.':
    'Ширину підібрано для імпедансу на низьких частотах; на високих дисперсія трохи зсуває Z0.',
  'The target is too high to reach by changing the width: even the narrowest trace is lower.':
    'Ціль надто висока: навіть найвужчий провідник дає менший імпеданс.',
  'The target is too low to reach by changing the width: even the widest trace is higher.':
    'Ціль надто низька: навіть найширший провідник дає більший імпеданс.',
  'Characteristic impedance Z0': 'Хвильовий опір Z0',
  'Differential impedance': 'Диференціальний імпеданс',
  'Common-mode impedance': 'Синфазний імпеданс',
  'Effective permittivity εeff': 'Ефективна проникність εeff',
  Delay: 'Затримка',
  Wavelength: 'Довжина хвилі',
  'Conductor loss': 'Втрати в провідниках',
  'Dielectric loss': 'Діелектричні втрати',
  'Total loss': 'Загальні втрати',
  'Skin depth': 'Товщина скін-шару',
  Single: 'Одиночна',
  Even: 'Парна',
  Odd: 'Непарна',
  'Cross-section': 'Поперечний переріз',
  'Cross-section of the line, drawn to scale': 'Поперечний переріз лінії в масштабі',
  'Impedance versus width': 'Імпеданс залежно від ширини',
  'Loss versus frequency': 'Втрати залежно від частоти',
  'Impedance Z0 versus trace width': 'Імпеданс Z0 залежно від ширини провідника',
  'Attenuation versus frequency': 'Загасання залежно від частоти',
  Width: 'Ширина',
  'Diameter d': 'Діаметр d',
  'Impedance (Ω)': 'Імпеданс (Ω)',
  'Z0 even': 'Z0 парна',
  'Z0 odd': 'Z0 непарна',
  'Z differential': 'Z диференціальний',
  Conductor: 'Провідники',
  Dielectric: 'Діелектрик',
  Total: 'Загалом',
  'Loss (dB/m)': 'Втрати (дБ/м)',
  'Loss (dB/in)': 'Втрати (дБ/дюйм)',
  Notes: 'Примітки',
  'Width/height is outside 0.05 to 20: accuracy drops.': 'Відношення ширини до висоти поза діапазоном 0,05–20: точність падає.',
  'Coupled-line model is fitted for w/h and s/h between 0.1 and 10.': 'Модель зв’язаних ліній підібрана для w/h та s/h від 0,1 до 10.',
  'Stripline thickness above 25% of the spacing is outside the model range.': 'Товщина смужки понад 25% відстані виходить за межі моделі.',
  'Permittivity above 18 is outside the model range.': 'Проникність понад 18 виходить за межі моделі.',
  'Frequency is high for this substrate height: higher-order modes may appear.': 'Частота висока для такої висоти підкладки: можливі моди вищих порядків.',
}

export function tr(lang: Lang, s: string, ...args: (string | number)[]): string {
  const src = lang === 'uk' ? (UK[s] ?? s) : s
  return src.replace(/\{(\d+)\}/g, (_, i: string) => String(args[+i]))
}
