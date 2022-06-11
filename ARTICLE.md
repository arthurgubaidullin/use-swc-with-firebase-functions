# Используем SWC с Firebase функциями

В этой статье рассмотрим использование компилятора для js-кода облачных функций.

## Проблема

Создаем проект. Добавляем Firebase функцию.

```js
// index.js
export const helloWorld = https.onRequest(/** … */);
```

Через некоторое время добавляем ещё несколько.

```js
// index.js
export const helloWorld = https.onRequest(/** … */);
export const lol = https.onRequest(/** … */);
export const pirojok = https.onRequest(/** … */);
```

Ещё через некоторое время ещё и ещё.

А так как мы пишем код для людей, поэтому помимо кода, в нём будут комментарии и документация.

### Как увеличение количества кода влияет на проект?

Проект Firebase Functions — это node модуль. В `index.js` экспортируются все функции.

При первом запуске любой функции загружаются и инициализируются все импортированные файлы, от всех функций. Node.js загружает `index.js` и весь связанный код через `require` и/или `import`. Это особенность node модулей.

На время инициализации node модуля также влияют выражения, вычисляемые в этот момент.

Следующий пример будет вычисляться при каждой инициализации node модуля:

```js
// constants.js
const ONE_MINUTES_IN_MS = 60 * 1000;
```

Далее происходит обработка события функцией.

Поэтому, чем больше кода и чем он сложнее, тем больше времени нужно для инициализации каждой функции.

## Решение

Если сократить, упростить код и загружать только используемые модули для запущенной функции, то можно сократить время инициализации функций.

Как можно сократить код? Существуют несколько вариантов, среди них минификация и/или компиляция.

### Минификация и компиляция

Грубо говоря, минификация сделает имена переменных короткими, а компиляция — уберёт неиспользуемый код, предвычислит и упростит выражения, например: `50 + 50` превратит в `100`.

#### Минификация в действии

До:

```js
const hello = sayHello("Pirojok");
console.log(hello, 40 + 2);

function sayHello(name) {
  return `Hi, ${name}!`;
}
```

После:

```js
"use strict";
const a = b("Pirojok");
console.log(a, 40 + 2);
function b(a) {
  return `Hi, ${a}!`;
}
```

#### Компиляция в действии

До:

```js
const hello = sayHello("Pirojok");
console.log(hello, 40 + 2);

function sayHello(name) {
  return `Hi, ${name}!`;
}
```

После:

```js
"use strict";
var name;
const hello = `Hi, ${(name = "Pirojok")}!`;
console.log(hello, 42);
```

#### Компиляция и минификация в действии

До:

```js
const hello = sayHello("Pirojok");
console.log(hello, 40 + 2);

function sayHello(name) {
  return `Hi, ${name}!`;
}
```

После:

```js
"use strict";
var a;
const b = `Hi, ${(a = "Pirojok")}!`;
console.log(b, 42);
```

### Как загружать только используемые модули?

Основная идея — загружать модули в момент выполнения, а не инициализации функций.

Всё что нужно сделать — поместить загрузку модулей в тело обработчика функции.

До:

```js
import {https, logger} from "firebase-functions";
import {initializeApp} from "firebase-admin";

initializeApp();

export const helloWorld = https.onRequest((request, response) => {
  logger.info("Hello logs!", {structuredData: true, computed: 50 + 50});
  response.send("Hello from Firebase!");
});
```

После:

```js
import {https, logger} from "firebase-functions";

let app_inited_by_helloWorld = false;

export const helloWorld = https.onRequest(async (request, response) => {
  if (!app_inited_by_helloWorld) {
    const {initializeApp} = await import("firebase-admin");
    initializeApp();
    app_inited_by_helloWorld = true;
  }

  logger.info("Hello logs!", {structuredData: true, computed: 50 + 50});
  response.send("Hello from Firebase!");
});
```

Глобальная переменная `app_inited_by_helloWorld` нужна, чтобы `firebase-admin` приложение инициализировалось, только один раз.

В глобальные переменные также можно помещать переменные из импортированных модулей.

Подробнее про [этот трюк](https://firebase.google.com/docs/functions/tips#use_global_variables_to_reuse_objects_in_future_invocations) можно почитать в документации Firebase.

### Какой минификатор и компилятор выбрать?

В качестве компилятора и/или минификатора можно использовать проект SWC или любой другой.

### Используем SWC

Я выбрал SWC, он умеет минифицировать и компилировать код одновременно.

#### Установка

Установить SWC можно по [инструкции](https://swc.rs/#overview).

Чтобы создать конфигурационный файл `.swcrc` и подобрать нужные вам настройки, я рекомендую использовать [playground](https://swc.rs/playground) проекта. Получить конфигурацию можно нажав кнопку _Edit as JSON_.

Для Firebase Functions рекомендую сразу задать `Env Targets` = `node 16` и убрать `jsc.target` в конечном файле.

_Playground_ добавляет в конфигурационный файл опцию `"isModule"` = `true`, её потребуется удалить, если компилятор, будет выдавать ошибку в вашем проекте.

Бонусом можно настроить использование es-модулей, весь старый код, использующий `require`, и новый будут прекрасно жить вместе. Отличная возможность для плавного перехода на es-модули.

##### Подготовка кода проекта

Для того, чтобы код можно было компилировать и использовать, его нужно как-то разделять между собой. Отличным способом является разделение по директориям `src` и `lib`. Если весь код лежит в корне пакета, то это сильно осложнит процесс.

После подготовки можно настроить скрипты для компиляции проекта.

В `package.json` нужно изменить точку входа и добавить скрипты:

```json
{
  "main": "lib/index.js",
  "scripts": {
    "dev": "swc src -w -d lib",
    "build": "swc src -d lib"
  }
}
```

`build` компилирует код из директории `src` в `lib`, а `dev` следит за изменениями файлов и перекомпилирует их. `dev` может потребоваться для удобной работы с эмулятором, для него потребуется установить дополнительный [пакет](https://swc.rs/docs/usage/cli#--watch--w).

#### Автоматизация деплоя

Чтобы не забыть перед деплоем компилировать проект, рекомендую установить predeploy скрипт. Это можно сделать в `firebase.json`.

```json
{
  "functions": {
    "predeploy": [
      "npm --prefix \"$RESOURCE_DIR\" run lint",
      "npm --prefix \"$RESOURCE_DIR\" run build"
    ]
  }
}
```

Теперь при вызове команды `firebase deploy`, код предварительно будет собран.

### Пример проекта

[Пример](https://github.com/arthurgubaidullin/using-swc-with-firebase-functions) уже настроенного Firebase проекта можно посмотреть на GitHub.

### Подводные камни

Если во время выполнения кода появится ошибка, то прочитать её стектрейс будет затруднительно из-за модификаций кода.

Эта проблема решается генерацией **source maps** и подключением модуля [source-map-support](https://github.com/evanw/node-source-map-support).

### Полезные ссылки

1. [Use TypeScript for Cloud Functions](https://firebase.google.com/docs/functions/typescript) (Firebase Documentation)
1. [Tips & tricks](https://firebase.google.com/docs/functions/tips) (Firebase Documentation)

### Финал

Поздравляю! Теперь ваш проект компилируемый и вы сделали небольшой шаг в его оптимизации.

Чтобы одним из первым прочитать мою следующую статью, можно подписаться на мой [канал](https://t.me/arthur_g_wrotes) в Телеграм.

Если у вас возникли вопросы или замечания, можно свободно писать их в комментариях.

### Лицензия

Лицензировано под [Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/).
