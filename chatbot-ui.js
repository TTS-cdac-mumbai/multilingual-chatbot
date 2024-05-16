/**
 * {@link https://github.com/TTS-cdac-mumbai/multilingual-chatbot-fe}  
 * summary Makes backend API call to rasa chatbot and display output to chatbot frontend
 * license {@link https://github.com/TTS-cdac-mumbai/multilingual-chatbot-fe/blob/main/LICENSE}
 * @author Language Computing Group, CDAC Mumbai
 * 
 * 
*/

const TRANSLITERATE_API = "https://xlit-api.ai4bharat.org";

const CHATBOT_API = "../../multi/send_to_bot";

const ASR_API = "../../multi/recognize_iitm";
const CDAC_ASR_API = "../../asr/transcribe";

const TTS_API = "../../mulit/synthesize_iitm";
const TTS_API_LOCAL = "../../multi/synthesize_iitm_local";

const BHASHINI_API = "https://dhruva-api.bhashini.gov.in/services/inference/pipeline";


var specialCharacterPattern = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\|\/\-="']/;


var recorder; // globally accessible
var isPaused = false;
// handles the record button/symbol
var isRecording = false;
var start = 0;
var isASR = false;
var userID = localStorage.getItem("userid");
var selectedLang = localStorage.getItem("chatlang");

//set the user id
if (userID == null) {
    userID = Math.floor(Math.random() * 90000) + 10000;
    localStorage.setItem("userid", userID);
}

//set the chatbot language
if (selectedLang == null) {
    localStorage.setItem("chatlang", "en");
}

heading = document.getElementById("heading");
subHeading = document.getElementById("sub_heading");

console.log("USER ID : ", userID);
console.log("LANG : ", selectedLang);



function init() {

    //---------------------------- Including Jquery ------------------------------

    var script = document.createElement('script');
    script.src = 'https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js';
    script.type = 'text/javascript';
    document.getElementsByTagName('head')[0].appendChild(script);

    //--------------------------- Important Variables----------------------------
    botLogoPath = "./imgs/bot-logo.png"

    //--------------------------- Chatbot Frontend -------------------------------
    const chatContainer = document.getElementById("chat-container");

    template = ` <button class='chat-btn'><img src = "./icons/comment.png" class = "icon" ></button>

    <div class='chat-popup'>
    
		<div class='chat-header'>
			<div class='chatbot-img'>
				<img src='${botLogoPath}' alt='Chat Bot image' class='bot-img'> 
			</div>
			<h3 class='bot-title'>CDAC Bot</h3>
			<button class = "expand-chat-window" ><img src="./icons/open_fullscreen.png" class="icon" ></button>
		</div>

		<div class='chat-area'>
            <div class='bot-msg'>
                <img class='bot-img' src ='${botLogoPath}' />
				<span class='msg'>Hi, How can i help you?</span>
			</div>

            <!-- <div class='bot-msg'>
                <img class='bot-img' src ='${botLogoPath}' />
                <div class='response-btns'>
                    <button class='btn-primary' onclick= 'userResponseBtn(this)' value='/sign_in'>sample btn</button>            
                </div>
			</div> -->

			<!-- <div class='bot-msg'>
				<img class='msg-image' src = "https://i.imgur.com/nGF1K8f.jpg" />
			</div> -->

			<!-- <div class='user-msg'>
				<span class='msg'>Hi, How can i help you?</span>
			</div> -->

		</div>

        <span class="loader" style="position: absolute; left: 150px; top: 200px"></span>

        <div class='chat-input-area'>
             
        <input type='text' id='asr_text' autofocus class='chat-input' onkeypress='return givenUserInput(event)' placeholder='Type a message ...' autocomplete='off'>
        <div class="recorder"><button class="record_btn" id="micButton"></button></div>
        <button class='chat-submit'><i class='material-icons'>send</i></button>
        </div>
        <div>
            <select name="lang" id="lang_select" class='lang-input'>
                    <option value="en">English</option>    
                    <option value="hi">Hindi</option>
                    <option value="mr">Marathi</option>
                    <option value="gu">Gujarati</option>
                    <option value="kn">Kannada</option>
                    <option value="ta">Tamil</option>
                    <option value="te">Telugu</option>
            </select>
            <audio class="audio" id="audio" controls style="height: 30px; width: 260px">
            Your browser does not support the audio element.
            </audio>
        </div>
        <div>
        <label class="poweredbylabel" style="float:right; margin-right:20px; color:blue; font-size:12px;">Powered by 
        <a href="https://www.cdac.in/" target="_blank" title="CDAC Mumbai">
            <img alt="" src="imgs/cdac16x16.png" class="cdac-ico">
            </a>
        </label>
        </div>

	</div>
    `

    chatContainer.innerHTML = template;

    //--------------------------- Important Variables----------------------------

    title = "CDAC Bot";
    welcomeMessage = "Hi, I am CDAC Bot";

    chatPopup = document.querySelector(".chat-popup")
    chatBtn = document.querySelector(".chat-btn")
    chatSubmit = document.querySelector(".chat-submit")
    chatHeader = document.querySelector(".chat-header")
    chatArea = document.querySelector(".chat-area")
    chatInput = document.querySelector(".chat-input")
    expandWindow = document.querySelector(".expand-chat-window")
    micButton = document.querySelector(".record_btn")
    spinner = document.querySelector(".loader")
    root = document.documentElement;
    chatPopup.style.display = "none"
    var host = ""

    langInput = document.querySelector(".lang-input")
    audio_player = document.querySelector(".audio")

    // audio_player.style.visibility = "hidden";

    const msg = document.querySelector(".msg");
    msg.innerText = welcomeMessage;

    const botTitle = document.querySelector(".bot-title");
    botTitle.innerText = title;


    //------------------------ ChatBot Toggler -------------------------

    chatBtn.addEventListener("click", () => {

        mobileDevice = !detectMob()
        if (chatPopup.style.display == "none" && mobileDevice) {
            chatPopup.style.display = "flex"
            chatInput.focus();
            chatBtn.innerHTML = `<img src = "./icons/close.png" class = "icon" >`
        } else if (mobileDevice) {
            chatPopup.style.display = "none"
            chatBtn.innerHTML = `<img src = "./icons/comment.png" class = "icon" >`
        } else {
            mobileView()
        }
    })

    chatSubmit.addEventListener("click", () => {     
    //micButton.addEventListener("click", () => {
        let userResponse = chatInput.value.trim();
        if (userResponse !== "" && !specialCharacterPattern.test(userResponse)) {
            setUserResponse()
            send(userResponse)
        } else {
            var resp = [{
                "recipient_id": "User",
                "text": "Sorry! please type the query correctly"
            }]
            setBotResponse(resp);
            chatInput.value = ""
            return;
        }
    })


    micButton.addEventListener("click", () => {
        if (isRecording == false) {
            start = Date.now();
            console.log("counter start", start)
            audio_player.pause();
            startRecording();
        } else {
            stopRecording();
        }
    })

    expandWindow.addEventListener("click", (e) => {
        // console.log(expandWindow.innerHTML)
        if (expandWindow.innerHTML == '<img src="./icons/open_fullscreen.png" class="icon">') {
            expandWindow.innerHTML = `<img src = "./icons/close_fullscreen.png" class = 'icon'>`
            root.style.setProperty('--chat-window-height', 80 + "%");
            root.style.setProperty('--chat-window-total-width', 85 + "%");
        } else if (expandWindow.innerHTML == '<img src="./icons/close.png" class="icon">') {
            chatPopup.style.display = "none"
            chatBtn.style.display = "block"
        } else {
            expandWindow.innerHTML = `<img src = "./icons/open_fullscreen.png" class = "icon" >`
            root.style.setProperty('--chat-window-height', 500 + "px");
            root.style.setProperty('--chat-window-total-width', 380 + "px");
        }

    })
}

// end of init function


var passwordInput = false;

function userResponseBtn(e) {
    send(e.value);
}

// to submit user input when he presses enter
function givenUserInput(e) {
    if (e.keyCode == 13) {
        let userResponse = chatInput.value.trim();
        if (userResponse !== "" && !specialCharacterPattern.test(userResponse)) {
            setUserResponse()
            send(userResponse)
        } else {
            var resp = [{
                "recipient_id": "User",
                "text": "Sorry! please type the query correctly"
            }]
            setBotResponse(resp);
            chatInput.value = ""
            return;
        }
    }
}

// to display user message on UI
function setUserResponse() {
    let userInput = chatInput.value;
    // if (passwordInput) {
    //     userInput = "******"
    // }
    if (userInput) {
        let temp = `<div class="user-msg"><span class = "msg">${userInput}</span></div>`
        chatArea.innerHTML += temp;
        chatInput.value = ""
    } else {
        chatInput.disabled = false;
    }
    scrollToBottomOfResults();
}


function scrollToBottomOfResults() {
    chatArea.scrollTop = chatArea.scrollHeight;
}

/***************************************************************
Frontend Part Completed
****************************************************************/

function send(message) {

    var specialCharacterPattern = /[!@#$%^&*()_+{}\[\]:;<>,.?~\\|\/\-="']/;
        if(specialCharacterPattern.test(message)){
            var resp = [{
                "recipient_id": "User",
                "text": "Sorry! please reframe the query"
            }]
            setBotResponse(resp);      
            return;
    }

    selected_lang = langInput.value;

    host = CHATBOT_API

    chatInput.type = "text"
    passwordInput = false;
    chatInput.focus();
    console.log("User Message:", message)
    console.log("Sending request to :", host)
    var msg_id = Math.floor(Math.random() * 90000) + 10000;
    unique_id = userID + "_" + msg_id;
    var timeTaken = Date.now() - start;
    $.ajax({
        url: host,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            "message": message,
            "sender": unique_id,
            "lang": langInput.value,
            "time_taken": timeTaken,
            "isASR": isASR
        }),
        success: function (data, textStatus) {
            if (data != null) {
                obj = JSON.parse(data)
                // console.log("DATA : ", obj[0].text);
                start = 0;
                setBotResponse(obj);
                //for local tts
                getSynthesizedAudioLocal(selected_lang, obj[0].text);
                // for iitm api
                // getSynthesizedAudio(selected_lang, obj[0].text)
            }
            console.log("Rasa Response: ", data, "\n Status:", textStatus)
        },
        error: function (errorMessage) {
            setBotResponse("");
            console.log('Error occured : ' + errorMessage);
            spinner.style.visibility = "hidden";

        }
    });
    chatInput.focus();
}

//------------------------------------ Set bot response -------------------------------------
function setBotResponse(val) {
    setTimeout(function () {
        if (val.length < 1) {
            //if there is no response from Rasa
            // msg = 'I couldn\'t get that. Let\' try something else!';
            msg = "Sorry! I'm not able to respond";

            var BotResponse = `<div class='bot-msg'><img class='bot-img' src ='${botLogoPath}' /><span class='msg'> ${msg} </span></div>`;
            $(BotResponse).appendTo('.chat-area').hide().fadeIn(1000);
            scrollToBottomOfResults();
            chatInput.focus();

        } else {
            //if we get response from Rasa
            for (i = 0; i < val.length; i++) {
                //check if there is text message
                if (val[i].hasOwnProperty("text")) {
                    // const botMsg = val[i].text;
                    // if (botMsg.includes("password")) {
                    //     chatInput.type = "password";
                    //     passwordInput = true;
                    // }
                    var BotResponse = `<div class='bot-msg'><img class='bot-img' src ='${botLogoPath}' /><span class='msg'>${val[i].text}</span></div>`;
                    $(BotResponse).appendTo('.chat-area').hide().fadeIn(1000);
                }

                //check if there is image
                if (val[i].hasOwnProperty("image")) {
                    var BotResponse = "<div class='bot-msg'>" + "<img class='bot-img' src ='${botLogoPath}' />"
                    '<img class="msg-image" src="' + val[i].image + '">' +
                        '</div>'
                    $(BotResponse).appendTo('.chat-area').hide().fadeIn(1000);
                }

                //check if there are buttons
                if (val[i].hasOwnProperty("buttons")) {
                    var BotResponse = `<div class='bot-msg'><img class='bot-img' src ='${botLogoPath}' /><div class='response-btns'>`

                    buttonsArray = val[i].buttons;
                    buttonsArray.forEach(btn => {
                        BotResponse += `<button class='btn-primary' onclick= 'userResponseBtn(this)' value='${btn.payload}'>${btn.title}</button>`
                    })

                    BotResponse += "</div></div>"

                    $(BotResponse).appendTo('.chat-area').hide().fadeIn(1000);
                    chatInput.disabled = true;
                }

            }
            scrollToBottomOfResults();
            chatInput.disabled = false;
            chatInput.focus();
        }

    }, 500);
}

function mobileView() {
    $('.chat-popup').width($(window).width());

    if (chatPopup.style.display == "none") {
        chatPopup.style.display = "flex"
        // chatInput.focus();
        chatBtn.style.display = "none"
        chatPopup.style.bottom = "0"
        chatPopup.style.right = "0"
        // chatPopup.style.transition = "none"
        expandWindow.innerHTML = `<img src = "./icons/close.png" class = "icon" >`
    }
}

function detectMob() {
    return ((window.innerHeight <= 800) && (window.innerWidth <= 600));
}

function chatbotTheme(theme) {
    const gradientHeader = document.querySelector(".chat-header");
    const orange = {
        color: "#FBAB7E",
        background: "linear-gradient(19deg, #FBAB7E 0%, #F7CE68 100%)"
    }

    const purple = {
        color: "#B721FF",
        background: "linear-gradient(19deg, #21D4FD 0%, #B721FF 100%)"
    }



    if (theme === "orange") {
        root.style.setProperty('--chat-window-color-theme', orange.color);
        gradientHeader.style.backgroundImage = orange.background;
        chatSubmit.style.backgroundColor = orange.color;
    } else if (theme === "purple") {
        root.style.setProperty('--chat-window-color-theme', purple.color);
        gradientHeader.style.backgroundImage = purple.background;
        chatSubmit.style.backgroundColor = purple.color;
    }
}

function createChatBot(theme = "blue") {

    init()

    chatbotTheme(theme);


    spinner.style.visibility = "hidden";

    document.getElementById("lang_select").value = selectedLang;

    asr_check();

    chatInput.onkeyup = function (e) {
        if (start == 0 && chatInput.value != "") {
            start = Date.now();
            console.log("counter start", start)
        }
        isASR = false;
        if (e.keyCode == 32)
            if (langInput.value == "en") {
                return;
            } else {
                translitrate();
            }
    };
}

//      ############### RECORDING HANDLER -- START #################

function capturemic(callback) {
    navigator.mediaDevices.getUserMedia({ audio: true, video: false }).then(function (mic) {
        callback(mic);
    }).catch(function (error) {
        alert('Unable to capture your Recording. Please report to the developer');
        console.error(error);
    });
}

function stopRecordingCallback() {
    var blob = recorder.getBlob();
    recorder.mic.stop();
    var file_name = getDateTime() + ".wav"
   
    var selected_lang = langInput.value

    if (selected_lang == "gu"){
        model = "ai4bharat/conformer-multilingual-indo_aryan-gpu--t4"
        transcribeBhashini(model, selected_lang, blob)
    }
    else if(selected_lang == "kn" || selected_lang == "ta" || selected_lang == "te"){
        model = "ai4bharat/conformer-multilingual-dravidian-gpu--t4"
        transcribeBhashini(model, selected_lang, blob)
    }else{
        transcribeAudio(blob, file_name)
    }
    
    window.stop();
    
}


function startRecording() {

    capturemic(function (mic) {
        isRecording = true;

        //        h1.innerHTML = "SPEAK...";
        micButton.classList.add('recording');

        recorder = RecordRTC(mic, {
            type: 'audio',
            desiredSampRate: 8000,
            numberOfAudioChannels: 1,
            recorderType: StereoAudioRecorder
        });

        recorder.startRecording();

        var max_seconds = 1;
        var stopped_speaking_timeout;
        var speechEvents = hark(mic, {});

        speechEvents.on('speaking', function () {
            if (recorder.getBlob()) return;

            clearTimeout(stopped_speaking_timeout);


            if (recorder.getState() === 'paused') {
                clearTimeout(stopped_speaking_timeout);
                //h1.innerHTML = "PAUSED!";
            }

            if (recorder.getState() === 'recording') {
                //h1.innerHTML = "RECORDING...";
            }
        });

        speechEvents.on('stopped_speaking', function () {
            if (recorder.getBlob()) return;

            // recorder.pauseRecording();
        	
                stopped_speaking_timeout = setTimeout(function () {
                    //h1.innerHTML = 'STOPPED!';
                    micButton.click(stopped_speaking_timeout);
                }, max_seconds * 1000);            
        });
        // release mic on stopRecording
       
        recorder.mic = mic;
    });
}

function stopRecording() {
    //h1.innerHTML = 'STOPPED!';
    isRecording = false;
    micButton.classList.remove('recording');
    recorder.stopRecording(stopRecordingCallback);
    // window.stop();
}

//      ############### RECORDING HANDLER -- END #################


function getDateTime() {
    var currentdate = new Date();
    var datetime = "Rec_" + currentdate.getDate() + "-"
        + (currentdate.getMonth() + 1) + "-"
        + currentdate.getFullYear() + "_"
        + currentdate.getHours() + ":"
        + currentdate.getMinutes() + ":"
        + currentdate.getSeconds() + "-"
        + currentdate.getMilliseconds();
    return datetime;
}


//      ############### ASR HANDLER -- START #################

/**
 * upload file to the server
 * @param {blob} sound audio
 * @param {string} audio_file_name date_time
 */
function transcribeAudio(sound, audio_file_name) {

    console.log("SIZE : ", sound.size)
    // 10MB limit
    if (sound.size > 10000000) {
        console.log("File limit exceed!")
        return;
    }
    var reader = new window.FileReader();
    reader.readAsDataURL(sound);
    reader.onloadend = function () {
        base64 = reader.result;
        base64 = base64.split(',')[1];

        spinner.style.visibility = "visible";
        micButton.disabled = true;

        $.ajax({
            url: CDAC_ASR_API,
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                // "file_name" : audio_file_name,
                "lang": langInput.options[langInput.selectedIndex].text.toLowerCase(),
                "audio": base64
            }),
            success: function (data, textStatus) {
                console.log("Response: ", data, "\n Status:", textStatus)
                if (data != null) {

                    // chatInput.value =  data.response;

                    const obj = data;

                    chatInput.value = obj.text;
                    
                    isASR = true;
                    spinner.style.visibility = "hidden";
                    micButton.disabled = false;
                    isASR = true;
                    chatSubmit.click();   //added to automatically submit speech query
                }
            },
            error: function (errorMessage) {
                var resp = [{
                    "recipient_id": "User",
                    "text": "Sorry! I'm not able to recogonize!"
                }]
                setBotResponse(resp);
                console.log('Error' + errorMessage);
                spinner.style.visibility = "hidden";
                micButton.disabled = false;
            }
        });

    }
}

// for ASR -- server down -- not used
function transcribeIITM(sound, file_name) {

    spinner.style.visibility = "visible";
    micButton.disabled = true;
    const formData = new FormData();
    formData.append("language", langInput.value);
    formData.append("audio", sound);
    formData.append("filename", file_name);

    var oReq = new XMLHttpRequest();
    oReq.open("POST", ASR_API, true);
    oReq.onload = function (oEvent) {
        if (oReq.status == 200) {
            console.log(oReq.response);
            asr_response = oReq.response;
            const obj = JSON.parse(asr_response);
            resp = obj.response;
            msg = resp.replace(/(^"|"$)/g, '')
            const obj2 = JSON.parse(msg);
            chatInput.value = obj2.transcript;

            console.log("ASR Time:", ((Date.now() - start) / 1000) % 60);

            spinner.style.visibility = "hidden";
            micButton.disabled = false;
            isASR = true;

        } else {
            var resp = [{
                "recipient_id": "User",
                "text": "Sorry! I'm not able to recogonize!"
            }]
            setBotResponse(resp);
            console.log('Error' + errorMessage);
            spinner.style.visibility = "hidden";
            micButton.disabled = false;
        }
    };
    console.log("Sending file!")
    oReq.send(formData);
}


// Bhasini API for ASR
function transcribeBhashini(model, lang, blob) {

    // console.log("SIZE : ", sound.size)
    // 10MB limit
    // if(sound.size > 10000000){
    //     console.log("File limit exceed!")
    //     return;
    // }
    var fileInBase64Format = new FileReader();
    fileInBase64Format.readAsDataURL(blob);
    fileInBase64Format.onloadend = function () {
        var base64data = fileInBase64Format.result;
        // console.log(base64data);
        base64data = base64data.substr(base64data.indexOf(',')+1)
        console.log("BASE 64 : ", base64data);

        //var fileInBase64Format = btoa(blob);

        var postData = {

            "pipelineTasks": [
                {
                    "taskType": "asr",
                    "config": {
                        "language": {
                            "sourceLanguage": lang
                        },
                        "serviceId": model,
                        "audioFormat": "wav",
                        "samplingRate": 8000
                    }
                }
            ],
            "inputData": {

                "audio": [
                    {
                        "audioContent": base64data
                    }
                ]
            }

        }

        console.log("json sent", postData)


        var xhr = new XMLHttpRequest();
        var url = BHASHINI_API;
        xhr.open("POST", url, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Authorization", "YOUR_KEY");
        xhr.onreadystatechange = function () {
            const status = xhr.status;
            if (status === 0 || (status >= 200 && status < 400)) {
                var json = JSON.parse(xhr.responseText);
                // console.log("output:", json);
                
                asr_response = json["pipelineResponse"][0]["output"][0]["source"]
                // const obj = JSON.parse(asr_response);

                chatInput.value = asr_response;
                isASR = true;
                spinner.style.visibility = "hidden";
                micButton.disabled = false;
                isASR = true;
            }
            else{
                console.log("Something went wrong! ");
                var resp = [{
                    "recipient_id": "User",
                    "text": "Sorry! I'm not able to recogonize!"
                }]
                setBotResponse(resp);
                spinner.style.visibility = "hidden";
                micButton.disabled = false;
            }
        };
        var data = JSON.stringify(postData);
        spinner.style.visibility = "visible";
        micButton.disabled = true;
        xhr.send(data);
    }

}

//      ############### ASR HANDLER -- END #################


//      ############### TTS HANDLER -- START #################

// For TTS
function getSynthesizedAudioLocal(selected_lang, message) {
    $.ajax({
        url: TTS_API_LOCAL,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            "language": selected_lang,
            "message": message
        }),
        success: function (data, textStatus) {
            if (data != null) {

                audio_loc =  data.response;

                // audio_loc = data.response
                audio_player_location = audio_loc;
                audio_player.src = audio_loc;
                audio_player.load();
                audio_player.play();
                console.log("Playing audio : " + audio_loc);
            }
            console.log("Audio Response: ", data, "\n Status:", textStatus)
        },
        error: function (errorMessage) {
            var resp = [{
                "recipient_id": "User",
                "text": "Sorry! I'm not able to synthesis!"
            }]
            setBotResponse(resp);
            console.log('Error' + errorMessage);
            spinner.style.visibility = "hidden";

        }
    });

}

// For TTS 
function getSynthesizedAudio(selected_lang, message) {
    // console.log("message : ",message)
    $.ajax({
        url: TTS_API,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            "language": selected_lang,
            "message": message
        }),
        success: function (data, textStatus) {
            if (data != null) {
                tts_response = JSON.parse(response_raw);
                audio_base64 = tts_response.audio;

                if (audio_base64 != null) {
                    audio_wav = "data:audio/wav;base64," + audio_base64
                    audio_player_location = audio_wav;
                    audio_player.src = audio_wav;
                    audio_player.load();
                    audio_player.play();
                }
            }
            console.log("Audio Response: ", data, "\n Status:", textStatus)
        },
        error: function (errorMessage) {
            var resp = [{ "recipient_id": "User", "text": "Sorry! I'm not able to synthesis!" }]
            setBotResponse(resp);
            console.log('Error' + errorMessage);
            spinner.style.visibility = "hidden";

        }
    });

}

function synthesisBhashiniText(text) {

    var postData = {
        "pipelineTasks": [
            {
                "taskType": "tts",
                "config": {
                    "language": {
                        "sourceLanguage": langInput.value
                    },
                    "serviceId": "ai4bharat/indic-tts-coqui-misc-gpu--t4",
                    "modelId":"63f7384c2ff3ab138f88c64e",
                    "gender": "female"
                }
            }
        ],
        "inputData": {
            "input": [
                {
                    "source": text
                }
            ],
            "audio": [
                {
                    "audioContent": null
                }
            ]
        }
    }

    console.log("json sent", postData)

    var xhr = new XMLHttpRequest();
    var url = BHASHINI_API;
    xhr.open("POST", url, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", "YOUR_KEY");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4 && xhr.status === 200) {
            var json = JSON.parse(xhr.responseText);
           
            // console.log("ASR Response: ",oReq.response);
            audio_base_64 = json["pipelineResponse"][0]["audio"][0]["audioContent"]


            audio_player.src = "data:audio/wav;base64," + audio_base_64;
            audio_player.load();
            audio_player.play();
    

        }else{
            var resp = [{ "recipient_id": "User", "text": "Sorry! I'm not able to synthesis!" }]
            setBotResponse(resp);
            console.log('Error' + errorMessage);
            spinner.style.visibility = "hidden";
        }
    };
    var data = JSON.stringify(postData);
    xhr.send(data);
}

//      ############### TTS HANDLER -- END #################

//      ############### translitrate HANDLER -- START #################

function translitrate() {

    const input = chatInput;
    const cursorPos = input.selectionStart;
    const textBeforeCursor = input.value.substring(0, cursorPos);
    const words = textBeforeCursor.split(" ");
    const lastWord = words[words.length - 2];

    if (!lastWord.trim() == "") {
        console.log("lang: ", langInput.value, "text: ", lastWord);
        getTransliterationSuggestions("en", langInput.value, lastWord);
    }
}


async function getTransliterationSuggestions(inputLang, lang, searchTerm) {

    // select.innerHTML = "";

    if (searchTerm == '.' || searchTerm == '..') {
        searchTerm = ' ' + searchTerm;
    }
    searchTerm = encodeURIComponent(searchTerm);

    const url = `${TRANSLITERATE_API}/tl/${lang}/${searchTerm}`;
    let response = await fetch(url, {
        credentials: 'include'
    });
    let data = await response.json();
    let alt = data.result
    console.log(alt);


    out = alt[0]
    console.log("output  : ", out)

    new_text = out + " ";

    var startPos = chatInput.selectionStart;
    var endPos = chatInput.selectionEnd;

    var replaceStartPos = (startPos - searchTerm.length) - 1; // replace the english word
    chatInput.value = chatInput.value.substring(0, replaceStartPos) + new_text + chatInput.value.substring(endPos); // Insert the new text at the cursor position

    newCursorLocation = replaceStartPos + new_text.length;
    chatInput.selectionStart = newCursorLocation;
    chatInput.selectionEnd = newCursorLocation;
    chatInput.focus(); // Ensure the input field retains focus
    micButton.disabled = false

}

async function getTransliterationForWholeText(inputLang, outputLang, text) {

    micButton.disabled = true;
    const data = {
        "input": [
            {
                "source": text
            }
        ],
        "config": {
            "isSentence": true,
            "language": {
                "sourceLanguage": inputLang,
                "targetLanguage": outputLang
            }
        }
    };

    const outputData = await fetch(TRANSLITERATE_API + "/tl/hi/" + text, {
        method: 'get',
        // body: JSON.stringify(data),
        headers: new Headers({
            'Content-Type': 'application/json'
        })
    })
        .then(response => response.json());
    out = outputData["result"];
    console.log("output  : ", out)

    new_text = out[0] + " ";

    var startPos = chatInput.selectionStart;
    var endPos = chatInput.selectionEnd;

    var replaceStartPos = (startPos - text.length) - 1; // replace the english word
    chatInput.value = chatInput.value.substring(0, replaceStartPos) + new_text + chatInput.value.substring(endPos); // Insert the new text at the cursor position

    newCursorLocation = replaceStartPos + new_text.length;
    chatInput.selectionStart = newCursorLocation;
    chatInput.selectionEnd = newCursorLocation;
    chatInput.focus(); // Ensure the input field retains focus
    micButton.disabled = false

}

//      ############### translitrate HANDLER -- END #################



$(function () {
    $("#lang_select").change(function () {
        console.log("language: ", langInput.value)
        localStorage.setItem("chatlang", langInput.value);
        chatInput.value = "";
        asr_check();

    });
});

function asr_check() {
    micButton.style.visibility = "visible";
    console.log("asr check : ", langInput.value)
    if (langInput.value == "") {
        console.log("asr not available")
        micButton.style.visibility = "hidden";
        // micButton.disabled =

    }
}


