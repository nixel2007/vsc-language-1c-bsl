function readContent(lib) {
    if (document.getElementById('cont').style.display === "none") {
        document.getElementById('cont').style.display = "block";
        document.getElementById('splitter1').style.display = "block";
        document.getElementById('struct').style.height = "133px";
    }
    document.getElementById('header').innerHTML = lib;
    try {
        var content = JSON.parse(window.os_library_data)[lib].content;
        var md = window.markdownit(defaults);
        document.getElementById('el').innerHTML = md.render(content);
    } catch (error){
        document.getElementById('el').innerHTML = 'Описание отсутствует';
        return;
    }
}