var AWS = require('aws-sdk');
var unirest = require("unirest");
//video in s3 bucket
var video_s3_url = 'https://s3665452-video.s3.amazonaws.com/6cd99979-e6c6-4f16-94f0-826ab34f55ff_1_200402T084119924Z.mp4';
var transcript = 'sample transcript';
var summary = 's';
var source_video_url = "sample source url";
var transcriptionJobName = 'TranscribeTest1';
var outputBucketName = 's3665452-transcript';
var nextPart = "sample";
var key = "sample key";
//var transcript1 = "sffd";
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
accessKeyId: 'ASIA4CWIRGO4EKPOBXPF',
  secretAccessKey: 'pCbhwsGHIwPYAUeQEjvcxmql7XcdZWe0FwGouUDK',
  sessionToken: 'FwoGZXIvYXdzEEkaDMf/SnADl3b0nPfG7SLLAducadZzteJCcWo/m4fwe0mOq9O5piuIuCkzSfPTgrBVRxfIYAb96RhyPyGsH9q6pCTofPMKEzOyddVlm8xYeAkzzubKtHeSoAGfNa9qXTfNAHqqVAxFL+JLCEi+P4O8uu/fUCTbRDa3mj6Lb1J3Gz0bBs7z4PhqrKR2cagDAkB2t0ymDmhOTgL7wt+d+5zXmUZh2xuqnYNLq7MsfdQhgl4QT2DGRb4gDIKIdw/mZDi/m5kStETHA+pInsT6bgh6aeefFalXD/m6FFXfKIa09/UFMi2jlSwVMqjbZSC7LnV97Eu6USDB2ReGiIMOcl685DPBlXEcAK6r2QdC0AEy8+0='});
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
  transcript = transcript.slice(15, transcript.length-2);
  console.log(transcript);   // successful response
//  transcript1 = transcript.slice(0, transcript.length/2);
});
}
//wait(1500);

function summarize() {

  var transcriptArray = new Array();
  var transcript1 = transcript;
  const limit = 5000;

  while(transcript1.length>limit) {
  var slice = transcript1.slice(0, limit);
  transcript1 = transcript1.slice(limit);
  transcriptArray.push(slice);
  }
  transcriptArray.push(transcript1);
  summary = " ";
  transcriptArray.forEach(getSummary);


  // function print(item, index) {
  //   console.log("partttttttttt");
  //   console.log(item);
  // }

async function getSummary(item, index) {
  await sleep(index*500);
  //console.log(item);
  //console.log("parttttttt");
  var req = unirest("GET", "https://aylien-text.p.rapidapi.com/summarize");

req.query({
	"title": "test",
	"text": item,
	"sentences_percentage": "10"
});

req.headers({
	"x-rapidapi-host": "aylien-text.p.rapidapi.com",
	"x-rapidapi-key": "6582c50e1dmsh00f64a90aa062b5p13d2f9jsnf619ed8e9a52"
});


req.end(function (res) {
	if (res.error) throw new Error(res.error);

//	console.log(res.body);
  //console.log(res.body.sentences);
  nextPart = JSON.stringify(res.body.sentences);
  nextPart = nextPart.slice(2, nextPart.length-1);
//  nextPart = nextPart;
//  console.log("nexrtttttt:" + nextPart);
  summary = summary.slice(0, summary.length-1);
  summary = summary + "," + nextPart;
  //console.log("test1: " + summary);
});
}
 }


//Put data to DynamoDB
function upload() {
  var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  var params_ddb = {
    TableName: 'Transcripts',
    Item: {
      'Link' : {S: key},
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
     key = source_video_url.slice(0, source_video_url.length-19);
    // transcribe(video_s3_url, transcriptionJobName, outputBucketName);
    // await sleep(15000);
    getFile();
    await sleep(5000);
   summarize();
   await sleep(5000);
   upload();
  // console.log(summary);
   await sleep(1000);
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
 await sleep(5000);
summarize();
await sleep(5000);
upload();
console.log(summary);
}

//test();
