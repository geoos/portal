const mensajes = {
    // Comunes
    comunes: {
        aceptar: { es: "Aceptar", pt: "Aceitar" },
        cancelar:{ es: "Cancelar", pt: "Cancelar"}
    },
    mainMenu: {
        miPanel: { es: "Mi Panel", pt: "Meu Painel"}
    }
}

if (window) {
    window.mensajes = mensajes
    window.languages = [{
        code:"es", name: "Español"
    }, {
        code:"pt", name: "Português"
    }]
} else {
    module.exports = mensajes;
}