function readContent(lib) {
    if (document.getElementById('cont').style.display === "none") {
        document.getElementById('cont').style.display = "block";
        document.getElementById('splitter1').style.display = "block";
        document.getElementById('struct').style.height = "133px";
    }
    document.getElementById('header').innerHTML = lib;
    try {
        let content = JSON.parse(window.os_library_data)[lib].content;
        let md = window.markdownit(defaults);
        document.getElementById('el').innerHTML = md.render(content);
    } catch (error) {
        document.getElementById('el').innerHTML = 'Описание отсутствует';
        return;
    }
}

function drag(elementToDrag, event) {
    // Зарегистрировать обработчики событий mousemove и mouseup,
    // которые последуют за событием mousedown.
    if (document.addEventListener) {
        // Стандартная модель событий
        // Зарегистрировать перехватывающие обработчики в документе
        document.addEventListener("mousemove", moveHandler, true);
        document.addEventListener("mouseup", upHandler, true);
    }
    event.cancelBubble = true;
    event.returnValue = false;

    function moveHandler(e) {
        // Переместить элемент в позицию указателя мыши с учетом позиций
        // полос прокрутки и смещений относительно начального щелчка.
        if (elementToDrag.id === "splitter1") {
            document.getElementById('struct').style.height =
                (e.clientY - document.getElementById('struct').offsetTop) + "px";
        } else {
            document.getElementById('el').style.height =
                (e.clientY - document.getElementById('el').offsetTop) + "px";
        }
        // И прервать дальнейшее распространение события.
        e.cancelBubble = true;
    }

    function upHandler(e) {
        // Удалить перехватывающие обработчики событий.
        if (document.removeEventListener) {
            document.removeEventListener("mouseup", upHandler, true);
            document.removeEventListener("mousemove", moveHandler, true);
        }
        e.cancelBubble = true;
    }
}

function escapeHtml(str) {
    const HTML_ESCAPE_TEST_RE = /[&<>"]/;
    const HTML_ESCAPE_REPLACE_RE = /[&<>"]/g;
    const HTML_REPLACEMENTS = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;'
    };

    function replaceUnsafeChar(ch) {
        return HTML_REPLACEMENTS[ch];
    }
    if (HTML_ESCAPE_TEST_RE.test(str)) {
        return str.replace(HTML_ESCAPE_REPLACE_RE, replaceUnsafeChar);
    }
    return str;
}

function readFile(file, sep) {
    if (document.getElementById('cont').style.display === "none") {
        document.getElementById('cont').style.display = "block";
        document.getElementById('splitter1').style.display = "block";
        document.getElementById('struct').style.height = "133px";
    }
    document.getElementById('header').innerHTML = file.split(sep).reverse()[1];
    let request = new XMLHttpRequest();
    request.open('GET', file);
    request.onload = function(e) {
        if (request.readyState == 4 && request.status == 200) {
            let md = window.markdownit(defaults);
            document.getElementById('el').innerHTML = md.render(request.responseText
                .replace(new RegExp("\`\`\`bsl", "g"), "\`\`\`1c"));
        }
    };
    request.send(null);
}

function fillDescriptionData(methodData, depp, descContext,
    paramContext, returns, strMethod, charSegment) {
    if (methodData[descContext]) {
        depp = methodData[descContext]
            .replace(new RegExp("\\\\^\\\\&\\\\*", "g"), '\\/')
            .replace(new RegExp("\\\\^\\\\&%", "g"), '\\\\')
            .replace(new RegExp("\\\\*\\\\&\\\\^", "g"), '\\"') + "<br/>";
    }
    if (methodData[returns]) {
        depp = depp + "<b><em>Возвращаемое значение: </em></b>" +
            methodData[returns].replace(new RegExp("\\\\*\\\\&\\\\^", "g"), '\\"')
            .replace(new RegExp("\\\\^\\\\&\\\\*", "g"), '\\/')
            .replace(new RegExp("\\\\^\\\\&%", "g"), '\\\\') + "<br/>";
    }
    if (methodData["Доступ"]) {
        depp = depp + "<b><em>Доступ: </em></b>" +
            methodData["Доступ"].replace("^&*", '\\/') + "<br/>";
    }
    let constructor = (charSegment === "constructors") ? "Новый " : "";
    if (charSegment === "methods" || charSegment === "constructors" ||
        charSegment === "object" || charSegment === "manager") {
        if (methodData[paramContext]) {
            for (let element in methodData[paramContext]) {
                let name_syntax = (element === "default") ? "" : " " + element;
                depp = depp + "<p><b>Синтаксис" + name_syntax + ":</b></p><p class='hljs'>" +
                    constructor + "<span class='function_name'>" + strMethod +
                    "</span><span class='parameter_variable'>" +
                    methodData[paramContext][element]["СтрокаПараметров"] + "</span></p>";
                if (typeof methodData[paramContext][element].Параметры !== "string") {
                    let header = false;
                    for (let param in methodData[paramContext][element].Параметры) {
                        if (header === false) {
                            depp = depp + "<p><b>Параметры:</b></p><p>";
                            header = true;
                        }
                        let paramDescription = "<b><em>" + param + ":</em></b> " +
                            methodData[paramContext][element].Параметры[param]
                            .replace(new RegExp("\\\\^\\\\&\\\\*", "g"), '\\/')
                            .replace(new RegExp("\\\\^\\\\&%", "g"), '\\\\')
                            .replace(new RegExp("\\\\*\\\\&\\\\^", "g"), '\\"');
                        depp = depp + paramDescription + "<br/>";
                    }
                } else if (methodData[paramContext][element].Параметры !== "") {
                    depp = depp + "<p><b>Параметры:</b></p><p>";
                    depp = depp + methodData[paramContext][element].Параметры
                        .replace(new RegExp("\\\\^\\\\&\\\\*", "g"), '\\/')
                        .replace(new RegExp("\\\\^\\\\&%", "g"), '\\\\')
                        .replace(new RegExp("\\\\*\\\\&\\\\^", "g"), '\\"');
                }
                depp = depp + "</p>";
            }
        } else {
            let ret = new RegExp("Тип: ([^.]+)\\.", "");
            let retValue = (!methodData[returns]) ? "" : ": " + ret.exec(methodData[returns])[1];
            depp = depp + "<p><b>Синтаксис:</b></p><p class='hljs'>" +
                "<span class='function_name'>" + strMethod +
                "</span><span class='parameter_variable'>()" +
                retValue + "</span></p>";
        }
    }
    if (methodData["example"] && descContext === "description") {
        console.log()
        depp = depp + "<p><b>Пример:</b></p><pre class='hljs'>" +
            hljs.highlight("1c", methodData["example"]
                .replace(new RegExp("\\\\^\\\\&\\\\*", "g"), '\\/')
                .replace("^&%", '\\\\')
                .replace(new RegExp("\\\\*\\\\&\\\\^", "g"), '\\"')
                .replace(new RegExp("<br>", "g"), String.fromCharCode(10)), true).value +
            "</pre>";
    }
    return depp;
}

function switchDescription(elem) {
    let charSegment = "";
    if (elem.id.slice(0, 6) === "method") {
        charSegment = "methods";
    } else if (elem.id.slice(0, 8) === "properti") {
        charSegment = "properties";
    } else if (elem.id.slice(0, 11) === "constructor") {
        charSegment = "constructors";
    } else if (elem.id.slice(0, 5) === "value") {
        charSegment = "values";
    }
    let strMethod =
        document.getElementById('headerMethod').innerHTML.replace("<br>", "").replace(
            new RegExp('\\n[ ]*', 'm'), '').split(" / ")[0];
    let strSegment =
        document.getElementById('header').innerHTML.replace(
            new RegExp('\\n[ ]*', 'm'), '').split(" / ")[0];
    let methodData =
        JSON.parse(window.bsl_language)[strSegment][charSegment][strMethod];
    if (charSegment === "constructors") {
        strMethod = strSegment;
    }
    let depp = "";
    if (document.getElementById('desc').innerHTML.slice(0, 11) === "Описание 1С") {
        depp = fillDescriptionData(
            methodData, depp, "description", "signature", "returns", strMethod, charSegment);
        document.getElementById('desc').innerHTML =
            "Описание OneScript<br/>(<span class='a' id = '" + charSegment +
            "' onclick='switchDescription(this)' style='font-size:1em'>переключить</span>)";
    } else {
        depp = fillDescriptionData(methodData, depp, "description1C",
            "signature1C", "returns1C", strMethod, charSegment);
        document.getElementById('desc').innerHTML =
            "Описание 1С<br/>(<span class='a' id = '" + charSegment +
            "' onclick='switchDescription(this)' style='font-size:1em'>переключить</span>)";
    }
    document.getElementById('elMethod').innerHTML = depp;
}

function closeMethod() {
    document.getElementById('contMethod').style.display = 'none';
    document.getElementById('splitter2').style.display = 'none';
    document.getElementById('el').style.height = '60%';
}

function closeCont() {
    document.getElementById('cont').style.display = 'none';
    document.getElementById('splitter1').style.display = 'none';
    document.getElementById('struct').style.height = '100%';
}