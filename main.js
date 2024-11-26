const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const xlsx = require("xlsx");
const path = require("path");
const mysql = require("mysql");
const fs = require("fs");

const conn = {
	host: "192.168.99.241",
	user: "ubob_admin",
	password: "Ubobadmin12345!",
	database: "UBOB_INFO",
	charset: "utf8",
	port: 3307,
};

let filePath;
let registYN = "n";

function createWindow() {
	// 브라우저 창 생성
	const win = new BrowserWindow({
		width: 490,
		height: 600,
		webPreferences: {
			preload: path.join(__dirname, "preload.js"),
			contextIsolation: true,
			enableRemoteModule: false,
			nodeIntegration: false,
		},
	});

	// HTML 파일 로드
	win.loadFile("index.html");

	// 메인 프로세스 호출할 함수
	ipcMain.on("button-click", (event, arg) => {
		dataBaseStart();
	});

	// 파일 선택 이벤트 처리
	ipcMain.handle("select-file", async () => {
		const result = await dialog.showOpenDialog({
			properties: ["openFile"],
			filters: [{ name: "Text Files", extensions: ["xls", "xlsx"] }],
		});

		if (result.canceled) return null; // 사용자가 파일 선택 취소
		filePath = result.filePaths[0];
		registYN = "n";

		// 파일의 내용 읽기
		const data = fs.readFileSync(filePath, "utf-8");
		return { filePath, data };
	});
}

app.whenReady().then(() => {
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});


////////////////// section 1 //////////////////////
let connection = mysql.createConnection(conn);

function dataBaseStart() {
	if (!filePath) {
		checkConditionAndShowAlert(`파일을 먼저 선택해주세요.`);
		return;
	}
	if (registYN == "y") {
		checkConditionAndShowAlert(`이미 데이터를 등록했습니다.`);
		return;
	}
	let excelFile = xlsx.readFile(`${filePath}`);
	const sheetName = excelFile.SheetNames[0];
	const firstSheet = excelFile.Sheets[sheetName];
	const jsonData = xlsx.utils.sheet_to_json(firstSheet, { defval: "" });
	const kwajungNum = jsonData.length;
	let codeText = "";
	// 데이터베이스 연결
	connection.connect((err) => {
		if (err) {
			console.error("error:", err);
			return;
		}
		console.log("MariaDB success");
	});

	for (let i = 0; i < jsonData.length; i++) {
		try {
			const company_name = jsonData[i].company_name;
			const kwajung_code = jsonData[i].kwajung_code;
			const kwajung_name = jsonData[i].kwajung_name;
			const contents_path = jsonData[i].contents_path;
			let sample_url = jsonData[i].sample_url.substring(23); // porting/web_link2/ex/V2/01/F001.htm?C02746

			// 수정할 쿼리 작성
			const insertQuery = `
		    INSERT INTO CONTENT_PATH
		    (COMPANY_NAME, KWAJUNG_CODE, KWAJUNG_NAME, CONTENTS_PATH, SAMPLE_URL)
		    VALUES (?, ?, ?, ?, ?)
		`;

			// 쿼리 실행
			console.log(kwajung_code);

			codeText += kwajung_code;
			if (i < jsonData.length - 1) {
				codeText += ",";
			}

			connection.query(
				insertQuery,
				[company_name, kwajung_code, kwajung_name, contents_path, sample_url],
				(err) => {
					if (err) {
						console.error("쿼리 실행 오류:", err);
						return;
					}
				}
			);
		} catch (error) {
			console.error("다시 확인 : ", jsonData[i].ubobUrl);
		}
	}

	// 렌더러 프로세스에 변수 전달
	ipcMain.handle("get-text", async () => {
		return { kwajungNum, codeText }; // 이 텍스트가 렌더러로 전달됨
	});

	registYN = "y";
	checkConditionAndShowAlert(`데이터 등록 완료`);

	// 연결 종료
	connection.end();
}

function checkConditionAndShowAlert(text) {
	dialog.showMessageBox({
		type: "info",
		title: "Alert",
		message: text,
		buttons: ["OK"],
	});
}
