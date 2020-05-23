var AWS = require('aws-sdk');
var unirest = require("unirest");
//video in s3 bucket
var video_s3_url = "s3://s3665452-video/64a6f77f-e43f-4ff8-bda0-b02a082aa71b_1_200513T231553044Z.mp4%3FExpires=1590147395&Signature=HfG9ZVkn219xdInw~WRrjBUouFJTWGWOw8Gv2zr96KAhTSvfmqZ0PM3CcfCdabYgHQQw8ye2rFZvGnqSivVywTAXF0IDIg-gwYym-LXQ~uawE-eAMG~KgCG5Ur~mvCQzzwM60i6jLCq313brX1"; //'https://s3665452-video.s3.amazonaws.com/6cd99979-e6c6-4f16-94f0-826ab34f55ff_1_200402T084119924Z.mp4';
var transcript = 'sample transcript';
var summary = 'sample summary';
//video url from webpage
var source_video_url = "sample source url";
var transcriptionJobName = 'TranscribeTest1';
var outputBucketName = 's3665452-transcript';
var nextPart = "sample";
var key = "sample key";
var transcriptArray = new Array();

//wait ms milliseconds
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

//set up amazon
AWS.config.update({
  region: 'us-east-1',
  accessKeyId: 'ASIA4CWIRGO4MHDDEV6D',
  secretAccessKey: '8kTfIFUtJKJO+AxIMCnEd10rBsOQgI8JfsHWKuMI',
  sessionToken: 'FwoGZXIvYXdzEAoaDOZONRb9qPjTpXh2XSLLAT/bmtfF0S8d+a4Jw38j3Ze+xzuCz8FiWcYNFFEQdpn9RGL9ru2cGwgyghjb8t+5Wls6CGuPjDXj2lJ9nxCcCkosjTvCFGWHqlxu9I7XF12tj3zRvvSS0pSPNoKCsh4KwT+0pktV5m3mEoJi8mzmG3izuNxEBHsmoD58A0Ed+ZOV5p3I8k9lciefHtx2ZymlDuFUXXpB5hqwJxji2kdPzCfRfppJn4WlTkx/3T6hWICBOwU2TzzYpLDvRV8/63Dx/nzD+j8jDEJhWYncKM7RofYFMi2pH6R7JQ1j6FU8+SyLvDuhE8XVYzQJXPhQOgixVLAHjmrkL9Y6oYrlyNLMGCg='
});

//DynamoDB
var ddb = new AWS.DynamoDB({
  apiVersion: '2012-08-10'
});
//search in DynamoDB with primary key gengrated from video url
function getFromDB() {
  var params = {
    Key: {
      "Link": {
        S: key
      }
    },
    TableName: "Transcripts"
  };
//if successful, retrieve transcript and summary
  ddb.getItem(params, function(err, data) {
    if (err) {
      console.log("an error occurred")
    }
    // successful response
    else if (data.Item != null) {
      //console.log(data.Item.Transcript.S);
      transcript = data.Item.Transcript.S;
      summary = data.Item.Summary.S;
    }
  })
}

//transcribe media file, put transcript in output bucket
function transcribe(mediaFileUrl, transcriptionJobName, outputBucketName) {
  var transcribeservice = new AWS.TranscribeService({
    apiVersion: '2017-10-26'
  });
  var params_transcribe = {
    LanguageCode: 'en-AU',
    /* required */
    Media: {
      /* required */
      MediaFileUri: mediaFileUrl
    },
    MediaFormat: 'mp4',
    /* required */
    TranscriptionJobName: transcriptionJobName,
    /* required */
    OutputBucketName: outputBucketName
  };
  transcribeservice.startTranscriptionJob(params_transcribe, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else console.log(data); // successful response
  });
}

//retrieve transcript from s3
async function getFile() {
  var s3 = await new AWS.S3({
    apiVersion: '2006-03-01'
  });
  var params_s3 = await {
    Bucket: outputBucketName,
    Key: transcriptionJobName + '.json'
  };
  await s3.getObject(params_s3, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else transcript = JSON.stringify(JSON.parse(data.Body.toString('ascii')).results.transcripts)
    transcript = transcript.slice(15, transcript.length - 2);
    console.log(transcript); // successful response
  });
}

//get summary from video transcript
function summarize() {
  summary = "";
  //api limit of characters per request
  const limit = 5000;
  //an array of cut text, so that each elements will be less than limit characters
  var waitingArray = new Array();
  //put every sentence in the text into an array, so that when building waitingArray,
  //a sentence will not be cut in half
  transcriptArray = transcript.replace(/([.?!])\s*(?=[A-Z])/g, "$1|").split("|");
  //create waitingArray
  while (transcriptArray.join(" ").length >= limit) {

    var part = transcriptArray[0];
    var i = 1;
    while (part.length + transcriptArray[i].length < limit) {
      part = part + " " + transcriptArray[i];
      i += 1;
    }
    waitingArray.push(part);
    transcriptArray = transcriptArray.slice(i);
  }
  waitingArray.push(transcriptArray.join(" "));
  //call getSummary() for each element in waitingArray
  waitingArray.forEach(getSummary);
  //using analysis API to summarize text
  async function getSummary(item, index) {
    //send request according to index to maintain the order of elements
    await sleep(index * 500);
    console.log(item);
    //unirest request
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

    req.end(function(res) {
      if (res.error) throw new Error(res.error);
      nextPart = JSON.stringify(res.body.sentences);
      nextPart = nextPart.slice(2, nextPart.length - 1);
      //put result in summary
      console.log("nexrtttttt:" + nextPart);
      summary = summary.slice(0, summary.length - 1);
      summary = summary + "," + nextPart;
    });
  }
}

//Put transcript and summary to DynamoDB
function upload() {
  var params_ddb = {
    TableName: 'Transcripts',
    Item: {
      'Link': {
        S: key
      },
      'Transcript': {
        S: transcript
      },
      'Summary': {
        S: summary
      }
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

//Handler of the API
exports.handler = async (event) => {
  if (event.httpMethod === "GET") {
    //get video url and make a key by removing the last 19 characters (time stamp)
    source_video_url = event.queryStringParameters.link;
    key = source_video_url.slice(0, source_video_url.length - 19);
    //see if key and data exists in DynamoDB
    await getFromDB();
    //if transcript did not update from DynamoDB, start analysing the video
    if (transcript === "sample transcript") {
      // transcribe(video_s3_url, transcriptionJobName, outputBucketName);
      // await sleep(15000);
      getFile();
      await sleep(5000);
      summarize();
      await sleep(5000);
      upload();
      // console.log(summary);
      await sleep(1000);
    }
    return getTranscribe(event);
  }
};

//send transcript and summary back
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
  source_video_url = "https://d1b5wfhwav7hwn.cloudfront.net/content/8b2662bd-ef2e-4e5c-859e-d6c4aa553d7f/20/05/08/09/8b2662bd-ef2e-4e5c-859e-d6c4aa553d7f_1_200508T095841900Z.mp4?Expires=1589629852";
  key = source_video_url.slice(0, source_video_url.length - 19);
  //getFromDB();
  //transcribe(video_s3_url, transcriptionJobName, outputBucketName);
   getFile();
  await sleep(5000);
  summarize();
  await sleep(5000);
  upload();
  console.log(summary);
}

//test();
