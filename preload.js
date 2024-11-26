window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector)
        if (element) element.innerText = text
    }
 
    for (const type of ['chrome', 'node', 'electron']) {
        replaceText(`${type}-version`, process.versions[type]);
    }
});



const { contextBridge, ipcRenderer } = require("electron");

// 렌더러 프로세스가 IPC 메시지를 받을 수 있도록 설정
contextBridge.exposeInMainWorld("ipcRenderer", {
	// on: (channel, callback) => ipcRenderer.on(channel, callback),
	callMainFunction: (data) => ipcRenderer.send("button-click", data),
	selectFile: async () => await ipcRenderer.invoke("select-file"),
	getText: async () => await ipcRenderer.invoke("get-text"),
});
