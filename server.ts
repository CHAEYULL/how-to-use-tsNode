//npm install typescript ts-node @types/express dotenv express mongodb 
/*
  "strictNullChecks": true,
 */
//테스트 코드 작성하려면 npm install jest --save-dev
//nodemon --exec ts-node server.ts
//env 세팅
import 'dotenv/config'
//비크립트 설치  npm install -D @types/bcrypt
import bcrypt from 'bcrypt'
//몽고디비 세팅
import {Db, MongoClient, ObjectId, WithId} from 'mongodb'
//익스프레스 기본 세팅
import express, { Request, Response } from 'express';
const app = express()
//html에다가 public안에있는 파일 가져다 쓰자
app.use(express.static(__dirname + '/public'/*가져다쓸 폴더명*/));
//npm install ejs
app.set('view engine', 'ejs') 
//요청.body 쓰려면 필요한 세팅 
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
//패스포트 라이브러리 추가 npm uninstall @types/passport-local passport-local
//npm install passport-local @types/passport-local
//패스포트 라이브러리 세팅
import session from 'express-session'
import passport from 'passport'
import { Strategy as LocalStrategy } from 'passport-local';
//세션 저장할 몽고 커넥트 설정 npm install connect-mongo @types/connect-mongo
import MongoStore from 'connect-mongo';
app.use(session({
    resave : false,
    saveUninitialized : false,
    secret: 'Firstrjtm1!',
    cookie : {maxAge : 1000 * 60},
    store: MongoStore.create({
      mongoUrl : process.env.URL,
      dbName: 'forum',
    })
  })) 
app.use(passport.initialize())
app.use(session({
  secret: 'dhkswjseogkrchdnfxmfkzoqtydWkdwkftodrlsdkscofud$@**#%(@',
  resave : false,
  saveUninitialized : false,
  cookie : {
    maxAge : 60 * 60 * 24000
  },
  store : MongoStore.create({
    mongoUrl : process.env.URL,
    dbName : 'forum'
  })
}))
//여기까지
//여기부터는 세션 테이블 만들어주는 함수 설정
passport.use(new LocalStrategy(async (입력한아이디: string, 입력한비번: string, cb: Function) => {
    let result = await db.collection('user').findOne({ username : 입력한아이디})
    if (!result) {
      return cb(null, false, { message: '아이디 DB에 없음' })
    }
    if (await bcrypt.compare(입력한비번, result.password)) {
      return cb(null, result)
    } else {
      return cb(null, false, { message: '비번불일치' });
    }
  }))
// interface User {
//     _id : ObjectId;
//     username : string;
//     password : string
// }
//   passport.serializeUser((user, done) => {
//     console.log(user);
//     process.nextTick(() => {
//         if (typeof user._id === 'object' && typeof user.username === 'string') {
//             done(null, { id: user._id, username: user.username });
//         } else {
//             console.log('에러남');
//         }
//     });
// });

//   passport.deserializeUser(async (user, done: any) => {
//     if (!user) {
//         return done(null, null); // 유저가 없는 경우에는 null 반환
//     }
//     const result = await db.collection<User>('user').findOne({ _id: new ObjectId(user.id) });
//     if (!result) {
//         return done(null, null); // 결과가 없는 경우에는 null 반환
//     }
//     process.nextTick(() => {
//         return done(null, result); // 결과 반환
//     });
// });


//여기까지 복붙해서 쓰면됨
//여기부터
let db : Db
let changeStream: any;
const url:string = process.env.URL as string;//env 파일에서 가져다쓰고싶으면 process.env.변수명
new MongoClient(url).connect().then((client) => {
  console.log('DB연결성공')
  db = client.db('forum')
    //여기부터
    let 조건 = [
    { $match : {operationType : 'insert'}}
    ]
            //change stream 사용법 감시하는거임
    changeStream = db.collection<PostType>('post').watch(/*조건일때만 아래 코드 실행해줌*/조건)
    //여기까지는 changestream 부분

  app.listen(8080/*env 파일에서 가져다쓰고싶으면 process.env.변수명*/, () => {
    console.log('http://localhost:8080 에서 서버 실행중') //MongoClient 함수 안에 있는거야
  })
}).catch((err) => {
  console.log(err)
})
app.get('/', async (요청: Request, 응답: Response) => {
    응답.sendFile(__dirname + '/index.html')
})
//여기까지는 복붙

///////////////////////////////////////////////////////////////////////////////////////////////////////
interface PostType {
    _id : ObjectId,
    title: string,
    content: string
  }
app.get('/list', async (요청:Request, 응답:Response)=>{
    let 디비에있는게시물 = await db.collection<PostType>('post').find().toArray()
    응답.render('list.ejs',{ 게시물 : 디비에있는게시물})
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////
//SSE 사용방법
app.get('/stream/list',(요청:Request, 응답:Response)=>{
    응답.writeHead(200, {
        "Connection": "keep-alive",
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
    })
    //응답.write('event: msg\n/*이벤트명 작명*/')
    //응답.write('data: 바보\n\n/*보낼데이터*/')
    //watch는 너무 많이 쓰면 성능 후져서 서버실행할때 한번만 ㄱㄱ
    changeStream.on('change',(변동사항:any)=>{
        //변동사항 생길때마다 실행할 코드
        // type 변동사항 = Object;
        // console.log(변동사항.fullDocument)//문서내용
        응답.write('event: post\n')
        응답.write(`data: ${JSON.stringify(변동사항.fullDocument)}\n\n`)
    })
})
/////////////////////////////////////////////////////////////////////////////////////////////////////////

app.get('/write', async (요청:Request, 응답:Response)=>{
    응답.render('write.ejs')
})


interface PostAddType {
    title : string,
    content : string
}
app.post('/add', async (요청:Request, 응답:Response)=>{
    console.log(요청.body)
    try {
        if (요청.body.title == '' || 요청.body.content == ''){
            응답.send('아무내용도 안적었슴당')
        } else if ( 요청.body.title.length > 1000 || 요청.body.content.length > 5000) {
            응답.send('너무 길어요 ㅠㅠ')
        } else {
            await db.collection<PostAddType>('post').insertOne({
                title : 요청.body.title,
                content : 요청.body.content,
            })
            응답.redirect('/list')
        }
    } catch(e){
        console.log(e)
        응답.status(500).send('서버에러남')
    }
})


app.get('/detail/:id', async (요청:Request, 응답:Response)=>{
    let 상세페이지:any = await db.collection('post').findOne({ _id : new ObjectId(요청.params.id) })
    let 댓글 = await db.collection('comment').find({ parentId : new ObjectId(요청.params.id) }).toArray()
    console.log(상세페이지)
    응답.render('detail.ejs',{상세페이지 : 상세페이지, 댓글 : 댓글})
})

app.get('/edit/:id', async (요청:Request, 응답:Response)=>{
    let 게시물정보 = await db.collection('post').findOne({_id : new ObjectId(요청.params.id)})
    응답.render('edit.ejs', {게시물정보 : 게시물정보});
})


app.post('/update', async (요청:Request, 응답:Response)=>{
    let 게시물id:ObjectId = 요청.body.id

    await db.collection<PostType>('post').updateOne(
        {_id : new ObjectId(게시물id) },
        {$set: {title : 요청.body.title,
                content : 요청.body.content}
        })
        try {
            if (요청.body.title == '' || 요청.body.content == ''){
                응답.send('아무내용도 안적었슴당')
            } else if ( 요청.body.title.length > 1000 || 요청.body.content.length > 5000) {
                응답.send('너무 길어요 ㅠㅠ')
            } else {
                await db.collection<PostType>('post').updateOne(
                    {_id : new ObjectId(게시물id) },
                    {$set: {title : 요청.body.title,
                            content : 요청.body.content}
                    })     
                응답.redirect('/list')
            }
        } catch(e){
            console.log(e)
            응답.status(500).send('서버에러남')
        }
})

app.delete('/delete', async (요청:Request, 응답:Response)=>{
    let 요청쿼리:any = 요청.query
    let 삭제할id:ObjectId = 요청쿼리.docid
    await db.collection('post').deleteOne({_id : new ObjectId(삭제할id)});
    // console.log(요청.query);
})



passport.serializeUser((user, done) => {
    console.log(user)
    process.nextTick(() => {
      done(null, { id: user._id, username: user.username })
    })
})

passport.deserializeUser( async (user, done) => {
    let result = await db.collection('user').findOne({
        _id : new ObjectId(user.id)
    })
    delete result.password
    process.nextTick(() => {
      return done(null, user)
    })
  })



app.get('/login', (요청:Request, 응답:Response)=>{
    console.log(요청.user)
    응답.render('login.ejs')
})
app.post('/login', async (요청:Request, 응답:Response, next:any)=>{
    passport.authenticate('local', (error:any, user:any, info:any) => {
        if (error) return 응답.status(500).json(error)
        if (!user) return 응답.status(401).json(info.message)
        요청.logIn(user, (err) => {
          if (err) return next(err)
          응답.redirect('/')
        })
    })(요청, 응답, next)
})

app.get('/register', (요청:Request, 응답:Response)=>{
    응답.render('register.ejs')
})
app.post('/register', async (요청: Request, 응답: Response) => {
    try {
        const existingUser = await db.collection('user').findOne({ username: 요청.body.username });
        if (existingUser) {
            응답.send('아이디 이미 있습니다 ㅠㅠ');
        } else {
            let 해시: string = await bcrypt.hash(요청.body.password, 10);
            await db.collection('user').insertOne({
                username: 요청.body.username,
                password: 해시
            });
            응답.redirect('/');
        }
    } catch (error) {
        console.log('에러남', error);
        응답.send('에러남');
    }
});


app.get('/mypage', async (요청:Request, 응답:Response)=>{
    let 유저정보 = await db.collection('post').findOne({ username : 요청.user})
    응답.render('mypage.ejs',{유저정보 : 유저정보})
})

// app.post('/comment', async (요청:Request, 응답:Response)=>{
//     let 사용자아이디:ObjectId = 요청.user._id; 
//     let 댓글내용:String = 요청.body.content;
//     let 사용자:String = 요청.user.username;
//     let 작성글아이디:ObjectId = 요청.body.parentId;
//     await db.collection('comment').insertOne({
//         content : 댓글내용,
//         writerId : new ObjectId(사용자아이디),
//         writer : 사용자,
//         parentId : new ObjectId(작성글아이디)
//     })
//     응답.redirect('back')
// })