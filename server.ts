//npm install typescript ts-node @types/express dotenv express mongodb 
/*
  "strictNullChecks": true,
 */
//nodemon --exec ts-node server.ts
import 'dotenv/config'
//몽고디비 세팅
import {Db, MongoClient, ObjectId} from 'mongodb'
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

let db : Db
let changeStream: any;
const url = "mongodb+srv://CHAEYULL:Firstrjtm1!@cluster0.kerfxac.mongodb.net/?retryWrites=true&w=majority";//env 파일에서 가져다쓰고싶으면 process.env.변수명
new MongoClient(url).connect().then((client) => {
  console.log('DB연결성공')
  db = client.db('forum')
  let 조건 = [
    { $match : {operationType : 'insert'}}
    ]
    //change stream 사용법 감시하는거임
    changeStream = db.collection<PostType>('post').watch(/*조건일때만 아래 코드 실행해줌*/조건)

  app.listen(8080/*env 파일에서 가져다쓰고싶으면 process.env.변수명*/, () => {
    console.log('http://localhost:8080 에서 서버 실행중') //MongoClient 함수 안에 있는거야
  })
}).catch((err) => {
  console.log(err)
})
app.get('/', async (요청: Request, 응답: Response) => {
    응답.sendFile(__dirname + '/index.html')
})


///////////////////
interface PostType {
    _id : ObjectId,
    title: string,
    content: string
  }
app.get('/list', async (요청:Request, 응답:Response)=>{
    let 디비에있는게시물 = await db.collection<PostType>('post').find().toArray()
    응답.render('list.ejs',{ 게시물 : 디비에있는게시물})
})
/////////////////////
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
/////////////////////

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