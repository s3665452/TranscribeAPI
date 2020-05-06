var AWS = require('aws-sdk');
var unirest = require("unirest");
//video in s3 bucket
var video_s3_url = 'https://s3665452-video.s3.amazonaws.com/6cd99979-e6c6-4f16-94f0-826ab34f55ff_1_200402T084119924Z.mp4';
var transcript = 'sample transcript';
var summary = 'sample summary';
var source_video_url = "sample source url";
var transcriptionJobName = 'TranscribeTest1';
var outputBucketName = 's3665452-transcript';
var transcript1 = "sffd";
//call to wait
// function wait(ms){
//    var start = new Date().getTime();
//    var end = start;
//    while(end < start + ms) {
//      end = new Date().getTime();
//   }
// }
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
//set up amazon
AWS.config.update({region:'us-east-1',
accessKeyId: 'ASIA4CWIRGO4I6IF76UT',
  secretAccessKey: 'wZZcdCp7Mo8dxlrB0R/en9+l18WUwBWD7ZwrkndJ',
  sessionToken: 'FwoGZXIvYXdzEHIaDNmRmbo8/51Uu9WK3CLLAbDOAkMQR0SPzj+sykuBjTE6yeVv5B+Iq20hXQ94Q00ELkiP4PPyCJlAwAptw5gG/YuZSkhMZVTaCDndAlFgPZgKWzs/KPc6RownZjNQu5+jr+IIgv8wd2dlRiac8/TCwTdRRgwP4GM7ElQmzYifT2zhv8oH1HgM0hhmhmHogfXNFCk8S3Bcxdwt2b8hPRpxUAVVP3tzF+RpgEi1lx8+U5YJyxek3l4d7gVvRU+6l2yQGVY1LH5ApLmFJ1dY0UDtb44sP6kA4pvpwSEwKMyGyPUFMi13HMBolLBpVS7SBd6GCAu8Q5HMPDUOaZOV5AVOR2p05qs/QpJ09rP/3ULK0fk='});
//transcribe media file
  function transcribe(mediaFileUrl, transcriptionJobName, outputBucketName) {
  var transcribeservice = new AWS.TranscribeService({apiVersion: '2017-10-26'});

  var params_transcribe = {
    LanguageCode: 'en-AU', /* required */
    Media: { /* required */
      MediaFileUri: mediaFileUrl
    },
    MediaFormat: 'mp4', /* required */
    TranscriptionJobName: transcriptionJobName, /* required */
    OutputBucketName: outputBucketName
  };
  transcribeservice.startTranscriptionJob(params_transcribe, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
     else     console.log(data);           // successful response
  //   wait(300000);
  //   getFile();
   });
  }

//Retrieve transcript from s3
async function getFile() {
var s3 = await new AWS.S3({apiVersion: '2006-03-01'});
var params_s3 = await {Bucket: outputBucketName, Key: transcriptionJobName + '.json'};
await s3.getObject(params_s3, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     transcript = JSON.stringify(JSON.parse(data.Body.toString('ascii')).results.transcripts)
  console.log(transcript);   // successful response
  transcript1 = transcript.slice(0, transcript.length/2);
});
}
//wait(1500);

function summarize() {

var req = unirest("GET", "https://aylien-text.p.rapidapi.com/summarize");

req.query({
	"title": "test",
	"text": transcript1,
	"sentences_percentage": "20"
});

req.headers({
	"x-rapidapi-host": "aylien-text.p.rapidapi.com",
	"x-rapidapi-key": "6582c50e1dmsh00f64a90aa062b5p13d2f9jsnf619ed8e9a52"
});


req.end(function (res) {
	if (res.error) throw new Error(res.error);

	console.log(res.body);
  console.log(res.body.sentences);
  summary = JSON.stringify(res.body.sentences);
});
 }


//Put data to DynamoDB
function upload() {
  var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  var params_ddb = {
    TableName: 'Transcripts',
    Item: {
      'Link' : {S: source_video_url},
      'Transcript' : {S: transcript},
      'Summary' : {S: summary}
    }
  };

ddb.putItem(params_ddb, function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Success", data);
  }
});
}

//Handler of API
exports.handler = async (event) => {
    if (event.httpMethod === "GET") {
     source_video_url = event.queryStringParameters.link;
    // transcribe(video_s3_url, transcriptionJobName, outputBucketName);
    // await sleep(15000);
     getFile();
     await sleep(10000);
  summarize();
  await sleep(15000);
  upload();
  //   await sleep(15000);
        return getTranscribe(event);
    }
};

//send data to the extension
 const getTranscribe = event => {
     let transcribe = {
         transcript: transcript,
         summary: summary,
         link: source_video_url,
         event: event
     };
     return {
         statusCode: 200,
         body: JSON.stringify(transcribe)
     };
 }
async function test() {
 getFile();
 await sleep(15000);
summarize();
await sleep(15000);
upload();
}

//test();
