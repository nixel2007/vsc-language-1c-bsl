*For English please scroll down*

# Поддержка языка 1С:Предприятие 8 (BSL) в VSC

[![GitHub release](https://img.shields.io/github/release/1c-syntax/vsc-language-1c-bsl.svg)](https://github.com/1c-syntax/vsc-language-1c-bsl/blob/master/CHANGELOG.md)
[![Build Status](https://travis-ci.org/1c-syntax/vsc-language-1c-bsl.svg?branch=develop)](https://travis-ci.org/1c-syntax/vsc-language-1c-bsl)
[![codecov](https://codecov.io/gh/1c-syntax/vsc-language-1c-bsl/branch/develop/graph/badge.svg)](https://codecov.io/gh/1c-syntax/vsc-language-1c-bsl)
[![Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=vsc-language-bsl-plugin&metric=alert_status)](https://sonarcloud.io/dashboard?id=vsc-language-bsl-plugin)
[![Greenkeeper badge](https://badges.greenkeeper.io/1c-syntax/vsc-language-1c-bsl.svg)](https://greenkeeper.io/)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)

Плагин добавляет подсветку синтаксиса в файлах \*.bsl и \*.os:

* `1C (BSL)`  - встроенного языка 1С:Предприятие 8 и [OneScript](http://oscript.io/)
* `1C (Query)` - языка запросов 1С:Предприятие 8

|1C (BSL)|1C (Query)|
|---|---|
|![bsl-vsc](https://cloud.githubusercontent.com/assets/1132840/13007621/9e730984-d1a2-11e5-8ff5-8f7945421184.PNG)|![query-vsc](https://cloud.githubusercontent.com/assets/1132840/13007618/9e6f578a-d1a2-11e5-9e30-7d48a269450d.PNG)|

Кроме подсветки, плагин предоставляет еще массу дополнительных функций

----

## Процедуры и функции

* Отображение списка методов текущего файла (`Ctrl`+`Shift`+`O`)
* Переход к определению (`F12`)
* Предварительный просмотр определения (`при наведении курсора мыши с зажатой клавишей Ctrl`)
* Информация о методе
* Автодополнение методов глобального контекста
* Синтаксис-помощник по методам глобального контекста
* Поиск мест использования метода [1][Примечание 1]
* Подсказка по параметрам метода [1][Примечание 1]
* Поиск определения (`Ctrl`+`T`) 

## Редактирование текста

* Автоматическое добавление символа `|` при добавлении новой строки во время редактирования строкового литерала
* Автоматическое добавление символов `//` при добавлении новой строки во время редактирования комментария по нажатию `Shift-Enter`
* Автоматическая вставка скобок
* Установка автоматических отступов по ключевым словам языка
* Встроенные шаблоны текста
* Пользовательские шаблоны текста (`Ctrl`+`Q`) - [инструкция](https://github.com/1c-syntax/vsc-language-1c-bsl/wiki/%D0%94%D0%B8%D0%BD%D0%B0%D0%BC%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B5-%D1%88%D0%B0%D0%B1%D0%BB%D0%BE%D0%BD%D1%8B)
* Автодополнение через точку [2][Примечание 2]
* Создание описания метода

## Валидация

* Проверка корректности кода в файлах `*.os` _(и `*.bsl` опционально)_ через интерпретатор OneScript - [инструкция](https://github.com/1c-syntax/vsc-language-1c-bsl/wiki/%D0%98%D1%81%D0%BF%D0%BE%D0%BB%D1%8C%D0%B7%D0%BE%D0%B2%D0%B0%D0%BD%D0%B8%D0%B5-%D0%BB%D0%B8%D0%BD%D1%82%D0%B5%D1%80%D0%B0)
* Статический анализ кода с помощью [BSL Language Server](https://1c-syntax.github.io/bsl-language-server), включая:  
  * отображение значения когнитивной и цикломатической сложностей метода над его определением
  * "быстрые исправления" для некоторых замечаний
  * анализ метаданных [3][Примечание 3]
  * исключение из анализа файлов, находящихся "на поддержке" конфигурации поставщика [3][Примечание 3]

## Прочее

* Запуск скриптов в файлах `.os`/`.bsl` с помощью OneScript - [инструкция](https://github.com/1c-syntax/vsc-language-1c-bsl/wiki/%D0%97%D0%B0%D0%BF%D1%83%D1%81%D0%BA-%D1%81%D0%BA%D1%80%D0%B8%D0%BF%D1%82%D0%BE%D0%B2-.os-.bsl-%D1%81-%D0%BF%D0%BE%D0%BC%D0%BE%D1%89%D1%8C%D1%8E-OneScript)
* Поддержка английского языка

----

## Примечания

### Примечание 1

[Примечание 1]: Примечание
> Для работы функции для скриптов OneScript необходимо
>
> * в системе должен быть установлен пакет [oscript-config](https://github.com/oscript-library/oscript-config) (`opm install oscript-config`)
> * В библиотеке OneScript должен присутствовать файл `lib.config`

### Примечание 2

[Примечание 2]: Примечание
> Для работы автодополнения для классов OneScript имя переменной должно совпадать с именем класса

### Примечание 3

[Примечание 3]: Примечание
> Только для проектов с исходным кодом конфигураций 1С:Предприятие 8

----

## Заключение

Более подробную информацию по настройке и использованию плагина можно получить в [WIKI проекта на GitHub](https://github.com/1c-syntax/vsc-language-1c-bsl/wiki) включая [offline установку](https://github.com/1c-syntax/vsc-language-1c-bsl/wiki/%D0%A3%D1%81%D1%82%D0%B0%D0%BD%D0%BE%D0%B2%D0%BA%D0%B0-%D0%BF%D0%B0%D0%BA%D0%B5%D1%82%D0%B0).

Сотрудничество крайне приветствуется. Разработка грамматик ведется в родительском репозитории [1c-syntax/1c-syntax](https://github.com/1c-syntax/1c-syntax).


## Лицензия [MIT](https://github.com/1c-syntax/vsc-language-1c-bsl/blob/master/LICENSE.md)

----
----

# 1С:Enterprise 8 (BSL) language support in VSC

Adds syntax highlighting to \*.bsl и \*.os files in VSC.

Contributions are greatly appreciated. Development is carried in a parent repository [1c-syntax/1c-syntax](https://github.com/1c-syntax/1c-syntax)

### Installation

[Wiki](https://github.com/1c-syntax/vsc-language-1c-bsl/wiki/Installation)

### License

[MIT](https://github.com/1c-syntax/vsc-language-1c-bsl/blob/master/LICENSE.md)
