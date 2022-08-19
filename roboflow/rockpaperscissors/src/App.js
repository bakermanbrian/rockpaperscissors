import logo from './logo.svg';
import './App.css';
import React from "react";
import {Button, TextField} from '@material-ui/core';
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';
import 'firebase/compat/auth';
import firebaseui from 'react-firebaseui';
import StyledFirebaseAuth from 'react-firebaseui/StyledFirebaseAuth';
import Webcam from 'react-webcam';
import axios from 'axios'





// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD5miP9bHMV3jHmT6kWBZULpDQr27HqLdY",
  authDomain: "rockpaperscissors-9f751.firebaseapp.com",
  projectId: "rockpaperscissors-9f751",
  storageBucket: "rockpaperscissors-9f751.appspot.com",
  messagingSenderId: "52090170103",
  appId: "1:52090170103:web:8a9eb7e73a38516f3741f2",
  databaseURL: "https://rockpaperscissors-9f751-default-rtdb.firebaseio.com/",

};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
var imgSrc=""


const videoConstraints = {
  width: 600,
  height: 360,
  facingMode: "user"
};

const WebcamCapture = ({cb}) => {
  const webcamRef = React.useRef(null);
  const capture = React.useCallback(
    () => {
      cb(webcamRef.current.getScreenshot())
    },
    [webcamRef]
  );
  return (
    <>
      <div>
      <Button variant="contained" onClick={capture}>...Shoot!</Button>
      </div>
      <Webcam
        audio={false}
        height={360}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        width={600}
        videoConstraints={videoConstraints}
      />
    </>
  );
};


class App extends React.Component {

  constructor(props){
    super(props);
    this.state = {
      hasLoaded: false,
      isSignedIn: false, // Local signed-in state.
    };
    this.reloadState=this.reloadState.bind(this)
    this.alreadySentVerificationEmail=false
  }

    // Configure FirebaseUI.
    uiConfig = {
      // Popup signin flow rather than redirect flow.
      signInFlow: 'popup',
      // We will display Google and Facebook as auth providers.
      signInOptions: [
        firebase.auth.EmailAuthProvider.PROVIDER_ID
      ],
      credentialHelper: 'none',
      callbacks: {
        // Avoid redirects after sign-in.
        signInSuccessWithAuthResult: () => {
          console.log("successful sign in")
          return false

        },

        signInFailure(error){
          console.log(error)
        }
      }
    };


  // Listen to the Firebase Auth state and set the local state.
  componentDidMount() {
    this.unregisterAuthObserver = firebase.auth().onAuthStateChanged(
        (user) => {
          if (user){
            firebase.auth().currentUser.getIdToken(true).then(() => this.setState({hasLoaded: true, isSignedIn: !!user}))
            firebase.database().ref("myMatch/"+firebase.auth().currentUser.uid).once("value").then((s) => {
              if (s.val() == null){
                firebase.database().ref("myMatch/").update({[firebase.auth().currentUser.uid]: "PLACEHOLDER"})
              }
            })

          }
          else{
            this.setState({hasLoaded: true, isSignedIn: false})
          }
        }

    );
  }

  reloadState(){
    firebase.auth().currentUser.reload().then(() => firebase.auth().currentUser.getIdToken(true)).then(() =>{
      this.setState({hasLoaded: true,isSignedIn: !!firebase.auth().currentUser})
    })
  }
  
  // Make sure we un-register Firebase observers when the component unmounts.
  componentWillUnmount() {
    this.unregisterAuthObserver();
  }

  render() {
    if (!this.state.hasLoaded){
      return <div style={{textAlign: "center"}}>
                <h1>Loading...</h1>
              </div>
    }
    if (!this.state.isSignedIn) {
      return (
        <div>
          <StyledFirebaseAuth uiConfig={this.uiConfig} firebaseAuth={firebase.auth()}/>
        </div>
      );
    }
    return (
      <div>
        <MainApp/>
      </div>
    );
  }
}


class RenderRounds extends React.Component{

  constructor(props){
    super(props)
  }

  render(){
    return <div>
    {this.props.rounds.map((item,i) => {
      var emojis={"rock": "🪨", "scissors": "✂️", "paper": "📝"}
      var meEmoji=""
      var oppEmoji=""
      var meChoice=item[firebase.auth().currentUser.uid]
      var oppChoice=item[this.props.opponent]
      if (meChoice != null){
        meEmoji=emojis[meChoice]
      }
      if(oppChoice != null){
        oppEmoji=emojis[oppChoice]
      }
      if (meChoice == null){
        oppEmoji="❓"
      }
      return <div><h4>Round {i+1}: ME:{meEmoji}  OPPONENT: {oppEmoji}</h4></div>
    })
    }
    </div>
  }

}

class HighScore extends React.Component{

  constructor(props){
    super(props)
    this.createListener=this.createListener.bind(this)
    this.destroyListener=this.destroyListener.bind(this)
    this.compare=this.compare.bind(this)
    this.state={
      "scores": []
    }
  }


  compare( a, b ) {
  if ( a.score < b.score ){
    return 1;
  }
  if ( a.score > b.score ){
    return -1;
  }
  return 0;
}

  createListener(){

    this.listener=firebase.database().ref("userWinners")
      .orderByChild("score")
      .on('value', snap => {
        var fin=[]
        var res=snap.val();
        console.log(res)
        for (var k in res){
          fin.push(res[k])
        }
        fin.sort(this.compare)
        this.setState({"scores": fin})
      });
  }


    destroyListener(){

    if (this.listener !== null){
      try{
        firebase.database().ref("myMatch/"+firebase.auth().currentUser.uid).off("value",this.listener)
        this.destroyMatchListener(this.state.match)
      }
      catch(err){

      }
    }
  }

  componentDidMount(){
    this.createListener()
  }

  componentWillUnmount(){
    this.destroyListener()
  }

  render(){
    return <div>
    <h1>High Scores</h1>
    {this.state.scores.map((item,i) => {
        var things={0: "🥇", 1: "🥈", 2:"🥉"}
        var emoji=""
        if (i in things){
          emoji=things[i]
        }
        return <div><h2>{emoji}{item["displayName"]}:{item["score"]}</h2></div>

      })
    }
    </div>
  }


}


class MainApp extends React.Component{

  constructor(props){
    super(props)
    this.state={
      "justOpened": true,
      "match": null,
      "opponent": null,
      "results": [],
      "matchOver": false,
      "winner": null,
      "img": ""

    }
    this.createListener=this.createListener.bind(this)
    this.createMatchListener=this.createMatchListener.bind(this)
    this.destroyListener=this.destroyListener.bind(this)
    this.destroyMatchListener=this.destroyMatchListener.bind(this)
    this.attackType=this.attackType.bind(this)
    this.calculateWinner=this.calculateWinner.bind(this)
    this.queueUp=this.queueUp.bind(this)
    this.listener=null
    this.matchListener=null
    this.newImg=this.newImg.bind(this)


  }


  calculateWinner(res){
    var score=0
    var me=firebase.auth().currentUser.uid
    var myHand=""
    var opponentHand=""
    for (var i=0; i < res.length; i++){
      myHand=res[i][me]
      opponentHand=res[i][this.state.opponent]
      if (myHand == "rock" && opponentHand == "scissors"){
        score=score+1
      }
      else if (myHand == "scissors" && opponentHand == "paper"){
        score=score+1
      }
      else if (myHand == "paper" && opponentHand == "rock"){
        score=score+1
      }
      else if (myHand == opponentHand){
        score=score
      }
      else{
        score=score-1
      }
    }
    console.log(score)
    if (score > 0){
      return me
    }
    else if (score == 0){
      return null
    }
    else{
      return this.state.opponent
    }
  }

  createMatchListener(m){
    this.matchListener=firebase.database().ref("matchInfo/"+m)
      .on('value', snap => {
        var res=snap.val();
        console.log(res)
        var matchOver=false
        var winner=null
        var opponent=""
        if (res["P1"] != firebase.auth().currentUser.uid){
          opponent=res["P1"]
        }
        if (res["P2"] != firebase.auth().currentUser.uid){
          opponent=res["P2"]
        }
        var opponentDisplayName=""
        if (res["displayName1"] != firebase.auth().currentUser.displayName){
          opponentDisplayName=res["displayName1"]
        }
        if (res["displayName2"] != firebase.auth().currentUser.displayName){
          opponentDisplayName=res["displayName2"]
        }
        var results=[]
        if (res["results"] != null &&  res["results"] != undefined){
          results=res["results"]
        }
        if (res != null){
          if (results.length == 3 && Object.keys(results[2]).length == 2){
            winner=this.calculateWinner(results)
            matchOver=true
          }
          this.setState({ "results": results, "winner": winner, "matchOver": matchOver, "opponent": opponent, "opponentDisplayName": opponentDisplayName})
        }
      });
  }

  createListener(){

    this.listener=firebase.database().ref("myMatch/"+firebase.auth().currentUser.uid)
      .on('value', snap => {
        var res=snap.val();
        if (res != null){
            this.destroyMatchListener(this.state.match)
        }
        if (res != null && res != "PLACEHOLDER"){
          this.setState({"match": res})
          this.createMatchListener(res)
        }
        else{
          this.setState({"match": null})
        }
      });
  }


    destroyListener(){

    if (this.listener !== null){
      try{
        firebase.database().ref("myMatch/"+firebase.auth().currentUser.uid).off("value",this.listener)
        this.destroyMatchListener(this.state.match)
      }
      catch(err){

      }
    }
  }


    destroyMatchListener(m){
    if (this.matchListener !== null){
      try{
        firebase.database().ref("matchInfo/"+m).off("value",this.matchListener)
      }
      catch(err){

      }
    }
  }

  queueUp(){
    if (this.state.winner == firebase.auth().currentUser.uid){
      firebase.database().ref("userWinners/"+firebase.auth().currentUser.uid).once('value').then((s) => {
        var score=1
        var res=s.val()
        if (res != null){
          score=res["score"]+1
        }
        firebase.database().ref("userWinners").update({[firebase.auth().currentUser.uid]: {"displayName": firebase.auth().currentUser.displayName, "score": score}})
      })
    }
    this.setState({"match": null,
      "opponent": null,
      "results": [],
      "matchOver": false,
      "winner": null,
      "justOpened": false,
      "opponentDisplayName": ""})
    this.destroyMatchListener(this.state.match)

    firebase.database().ref("openPeople").once('value').then((s) =>{
      var res=s.val()
      if (res == null){
        firebase.database().ref("openPeople").update({[firebase.auth().currentUser.uid]: firebase.auth().currentUser.displayName})
        firebase.database().ref("myMatch/").update({[firebase.auth().currentUser.uid]: "PLACEHOLDER"})
      }
      else if (!(firebase.auth().currentUser.uid in res)){
        var opponent=Object.keys(res)[0]
        var opponentDisplayName=res[opponent]
        var randomNum=Math.floor(Math.random() * (1000000 - 1) + 1);
        firebase.database().ref("matchInfo/").update({[randomNum]: {"P1": firebase.auth().currentUser.uid, "P2": opponent, "displayName1": firebase.auth().currentUser.displayName, "displayName2": opponentDisplayName,"results": []}})
        firebase.database().ref("openPeople/").update({[opponent]: null})
        firebase.database().ref("myMatch/").update({[opponent]: randomNum})
        firebase.database().ref("myMatch/").update({[firebase.auth().currentUser.uid]: randomNum})
      }
    })


  }

  attackType(attack){
    if (!this.state.matchOver && this.state.match != null && (this.state.results.length == 0 || Object.keys(this.state.results[this.state.results.length-1]).length == 2)){
      firebase.database().ref("matchInfo/"+this.state.match).update({["results/"+(this.state.results.length)+"/"+firebase.auth().currentUser.uid]: attack})
    }
    else if (!this.state.matchOver && this.state.match != null && !(this.state.results.length ==0) && Object.keys(this.state.results[this.state.results.length-1]).length == 1 && Object.keys(this.state.results[this.state.results.length-1])[0] != firebase.auth().currentUser.uid){
      firebase.database().ref("matchInfo/"+this.state.match).update({["results/"+(this.state.results.length-1)+"/"+firebase.auth().currentUser.uid]: attack})
    }
  }

  newImg(img){

    axios({
        method: "POST",
        url: "https://detect.roboflow.com/rockpaperscissors-szdkh/2",
        params: {
            api_key: "7XAR3PNGbWypZjliKmRb"
        },
        data: img,
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    })
    .then((response) => {
        console.log(response)
        var best=0.0
        var cl=""
        var preds=response["data"]["predictions"]
        for (var i=0; i < preds.length; i++){
          if (preds[i]["confidence"] > best){
            best=preds[i]["confidence"]
            cl=preds[i]["class"]
          }
        }
        if (cl != ""){
          this.attackType(cl)
        }
    })
    .catch(function(error) {
        console.log(error.message);
    });
  }

  componentDidMount(){
    this.createListener()
  }

  componentWillUnmount(){
    this.destroyListener()
  }

  render(){
    return <div>
    <h3>Instructions: This is a best-of-3 rock paper scissors game! When you see "In Game" on the screen, it means you are currently matched to an opponent. Press "Shoot" while holding up rock/paper/scissors on the screen to play your turn. If your opponent has moved, it will show as a question mark until you also reveal your move on the round. If your opponent hasn't played the round yet but you have, their result will be blank. Who shoots first on any round doesn't matter. At any time, you may return to the game lobby by clicking "Return to Lobby" to be matched with another player. After 3 rounds, a winner (or tie) will be revealed. Overall leaderboard of most wins is at the bottom.</h3>
    {this.state.match == null && !this.state.justOpened &&
      <div>
      <h1>WAITING IN LOBBY</h1>
      </div>
    }
    {this.state.match == null && this.state.justOpened &&
      <div>
      <h1>PRESS RETURN TO LOBBY TO GET TO LOBBY</h1>
      </div>
    }
    {this.state.match != null &&
      <div>
      <h1>IN GAME {this.state.match}</h1>
      </div>

    }
    <img src={this.state.img}/>
    <Button variant="contained" onClick={this.queueUp}>Return to Lobby</Button>
    <h2>Me: {firebase.auth().currentUser.displayName}</h2>
    <h2>Opponent: {this.state.opponentDisplayName}</h2>
    {this.state.matchOver && this.state.winner == this.state.opponent && 
      <h2>❌❌YOU LOSE❌❌
      </h2>
    }
    {this.state.matchOver && this.state.winner ==  firebase.auth().currentUser.uid && 
      <h2>✅✅YOU WIN✅✅
      </h2>
    }
    {this.state.matchOver && this.state.winner == null && 
      <h2>IT'S A TIE!
      </h2>
    }
    <RenderRounds rounds={this.state.results} opponent={this.state.opponent}/>
    <WebcamCapture cb={this.newImg}/>
    <HighScore/>
    </div>
  }
}


export default App;
