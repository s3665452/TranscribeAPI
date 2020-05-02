var AWS = require('aws-sdk');
//video in s3 bucket
var video_s3_url = 'https://s3665452-video.s3.amazonaws.com/6cd99979-e6c6-4f16-94f0-826ab34f55ff_1_200402T084119924Z.mp4';
var transcript = 'sample transcript';
var summary = 'sample summary';
var source_video_url = "sample source url";
//call to wait
function wait(ms){
   var start = new Date().getTime();
   var end = start;
   while(end < start + ms) {
     end = new Date().getTime();
  }
}
//set up amazon
AWS.config.update({region:'us-east-1',
accessKeyId: 'ASIA4CWIRGO4AJT3G6N2',
  secretAccessKey: '+taKWMifrSapX+8PmyD3Qv9MhyEEFbiEqfJFD3Cy',
  sessionToken: 'FwoGZXIvYXdzEB0aDHGRCS7yNwC9u7lMqCLLAVTDjMWeJRBsVq8QVfHkLwqStbfIT8Gev1N+uVbfFMP0t04gq7OwKPNRzdgbAwLAh0RIJ5W6/bLYr3DzGwIMMKTUeI5Z8uV4Ppfnfm6KSc0ql9lvuR1NAN7E6cDqeMtbHCDeg2zpjkzt2TUUdYvD9k3uoHzohYwihh6DguKL99+76EdLWHysxqZIu4ItYkSqDUipFu1uCFFP945Oc5hTN4PS8zdSEVSmS0hjRuf03gknz4ATCMhQoG5dglVq9xh8m7nkSY3GLem2LfVbKKWntfUFMi04AkxiaE4blJE39MnrfCGDPriXtQDSM3qHn5Io3NunHbkZnyhfL8b+s62cIgo='});
//Handler of API
exports.handler = async (event) => {
    if (event.httpMethod === "GET") {
      source_video_url = event.queryStringParameters.link;
      //Start transcribe
      var transcribeservice = new AWS.TranscribeService({apiVersion: '2017-10-26'});

      var params_transcribe = {
        LanguageCode: 'en-AU', /* required */
        Media: { /* required */
          MediaFileUri: video_s3_url
        },
        MediaFormat: 'mp4', /* required */
        TranscriptionJobName: 'RandallTest1', /* required */
        OutputBucketName: 's3665452-transcript'
      };
      transcribeservice.startTranscriptionJob(params_transcribe, function(err, data) {
        if (err) console.log(err, err.stack); // an error occurred
        else     console.log(data);           // successful response
        //Wait 5 minutes
        wait(300000);
        getFile();
      });
      //Wait 10 seconds
      wait(10000);
        return getTranscribe(event);
    }
};

//Retrieve transcript from s3
function getFile() {
var s3 = new AWS.S3({apiVersion: '2006-03-01'});
var params_s3 = {Bucket: 's3665452-transcript', Key: 'RandallTest1.json'};

s3.getObject(params_s3, function(err, data) {
  if (err) console.log(err, err.stack); // an error occurred
  else     transcript = JSON.stringify(JSON.parse(data.Body.toString('ascii')).results.transcripts)
  console.log(transcript);   // successful response

  var ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'});
  var params_ddb = {
    TableName: 'Transcripts',
    Item: {
      'Link' : {S: source_video_url},
      'Transcript' : {S: transcript},
      'Summary' : {S: summary}
    }
  };

  upload(ddb, params_ddb);
});
}
//wait(1500);


//Put data to DynamoDB
function upload(ddb, params_ddb) {
ddb.putItem(params_ddb, function(err, data) {
  if (err) {
    console.log("Error", err);
  } else {
    console.log("Success", data);
  }
});
}

//send data to the extension
 const getTranscribe = event => {
     let transcribe = {
         transcript: trancript,
         summary: 'summary,
         link: source_video_url,
         event: event
     };
     return {
         statusCode: 200,
         body: JSON.stringify(transcribe)
     };
 }
