import { getSession } from "@auth0/nextjs-auth0";
import { ChatSidebar } from "components/ChatSidebar/ChatSidebar"; 
import { Message } from "components/Message"; 
import clientPromise from "lib/mongodb";
import { ObjectId } from "mongodb";
import Head from "next/head"; 
import { useRouter } from "next/router";
import { streamReader } from "openai-edge-stream"; 
import { useEffect, useState } from "react"; 
import {v4 as uuid} from "uuid" ;

export default function ChatPage({ chatId, title, messages = []}) { 
  
  console.log("props: ",title, messages);
  const [newChatId, setNewChatId]= useState(null);
  const [incomingMessage, setIncomingMessage]= useState(""); 
  const [messageText,setMessageText]= useState(""); 
  const [newChatMessages, setNewChatMessages]= useState([]);/*to show messages btn user and system */ 
  const [generatingResponse , setGeneratingResponse]=useState(false);
  const[fullMessage, setFullMessage] = useState("");
  const router = useRouter();

  //save newy streamed msg to new chat messages
useEffect(()=>{
if(!generatingResponse && fullMessage){
  setNewChatMessages(prev => [...prev,{
    _id:uuid(),
    role:"assistant",
    content:fullMessage,
  }])
  setFullMessage("");
}
},[generatingResponse, fullMessage])
//when our route changes
useEffect(()=>{
  setNewChatMessages([]);
  setNewChatId(null)
  
  }, [chatId]);/*every time you click new chat empty the above*/

/*anytime the values change useeffect hook runs*/
  useEffect(()=> {
  if(!generatingResponse && newChatId) {
    setNewChatId(null);
    router.push(`/chat/${newChatId}`);
  }
  },[newChatId, generatingResponse, router]);
  
  const handleSubmit = async (e)=>{ 
    e.preventDefault(); 
    setGeneratingResponse(true); 
    setNewChatMessages( prev =>{ 
      const newChatMessages=[...prev, { 
        _id : uuid(), 
        role:"user", 
        content: messageText, 
      } 
    ]; 
    return newChatMessages; 
    }); 
    setMessageText(""); 

   //console.log("MESSAGE:",messageText); 
    const response= await fetch (`/api/chat/sendMessage`,{ 
      method:"POST", 
      headers: { 
        "content-type":'application/json' 
      }, 
      body:JSON.stringify({ chatId, message: messageText }), 
    }); 
  const data = response.body; 
  if(!data) { 
    return; 
  } 
  const reader=data.getReader();/*read all messages from sendmessg end point*/ 
 let content = "";
 
  await streamReader (reader,(message) => { 
  console.log("msg:", message); 
  if(message.event==="newChatId"){
     
    setNewChatId(message.content);
  }else{
  setIncomingMessage((s)=>`${s}${message.content}`); 
  content = content + message.content;
    }  
   }
  ); 
  setFullMessage(content);
  setIncomingMessage(" ");
  setGeneratingResponse(false); 
}; 

const allMessages =[...messages, ...newChatMessages];
  return ( 
    <> 
      <Head> 
        <title>New chat</title> 
      </Head> 
      <div className="grid h-screen grid-cols-[260px_1fr]  "> 
        < ChatSidebar chatId={chatId} /> 
        <div className=" flex flex-col overflow-hidden"> 
          <div className="flex-1 overflow-auto bg-slate-700 text-white  "> 
            {allMessages.map((message) =>( 
                  <Message 
                  key={message._id} 
                  role={message.role} 
                  content={message.content} 
                  /> 
            ) )} 
            {!! incomingMessage && ( 
            <Message  
            role="assistant"  
            content={incomingMessage}  
            /> 
            )} 
            </div> 
          <footer className="bg-slate-800 p-10"> 
            <form onSubmit={handleSubmit}>  
              <fieldset className="flex gap-2"disabled={generatingResponse}> 
                  <textarea  
                  value={messageText} 
                  onChange={(e) => setMessageText(e.target.value)} 
                  placeholder={generatingResponse? " ":"ask a question..."} className="w-full resize-none p-1 rounded-md bg-slate-700 text-white focus:border-emerald-500 focus:bg-slate-600 focus:outline focus:outline-emerald-500"/> 
                  <button type="submit" className="btn">Send</button> 
              </fieldset> 
            </form> 
          </footer> 
        </div> 
      </div> 
    </> 
  ); 
}

/*export const getServerSideProps= async (ctx) => {
  const chatId = ctx.params?.chatId?.[0] || null;
   
  if (chatId) {

  
    const { user} = await getSession(ctx.req, ctx.res);
    const client = await clientPromise;
    const db = client.db("ChitChat"); 
    const chat = await db.collection("chats").findOne({
      userId: user.sub,
      _id:new ObjectId(chatId),
      
      
    });
    
      return {
        props: {
          chatId,
          title:chat.title,
          messages: chat.messages.map((message) => ({
            ...message,
            _id:uuid()
          })),
        },  
      };    
  }
  return {
    props: {}
    
  };
};

export const getServerSideProps= async(ctx) =>{
  const chatId = ctx.params?.chatId?.[0] || null;
  if (chatId) {
      const { user } = await getSession(ctx.req, ctx.res);
      const client = await clientPromise;
      const db = client.db("ChitChat");
      const chat = await db.collections("chats").findOne({
        userId:user.sub,
        _id: new ObjectId(chatId),
      });
    return {
      props:{
          chatId,
          title: chat.title,
          messages: chat.messages.map((message) =>({
           ...message,
           _id: uuid(),
          })),
      },
    };
  }
  return {
    props: { }
  }
}*/
/*const getServerSideProps = async (ctx) => {
  const chatId = ctx.params.chatId;
  if (chatId) {
    const { user } = await getSession(ctx.req, ctx.res);
    const client = await clientPromise;
    const db = client.db("ChitChat");
    const chat = await db.collection("chats").findOne({
      userId: user.sub,
      _id: new ObjectId(chatId),
    });
    return {
      props: {
        chatId,
        title: chat.title,
        messages: chat.messages.map((message) => ({
          ...message,
          _id: uuid(),
        })),
      },
    };
  }
  return {
    props: {
      chat: {
        chatId: null,
        title: null,
        messages: [],
      },
    },
  };
};
*/
const getServerSideProps = async (ctx) => {
  const chatId = ctx.params.chatId;
  if (chatId) {
    const { user } = await getSession(ctx.req, ctx.res);
    const client = await clientPromise;
    const db = client.db("ChitChat");
    const chat = await db.collection("chats").findOne({
      userId: user.sub,
      _id: new ObjectId(chatId),
    });
    return {
      props: {
        chatId,
        title: chat.title,
        messages: chat.messages.map((message) => ({
          ...message,
          _id: uuid(),
        })),
      },
    };
  }
  return {
    props: {
      chat: {
        chatId: null,
        title: null,
        messages: [],
      },
    },
  };
};