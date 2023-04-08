window.getLuck = async function(){
    var input = "Write two sentences randomly about my luck of the day, make it kinda funny and interesting. Then on a new line rate the luck over 10.";
    await getPrompt(input).then(message =>{
        // console.log(message);
        var result = message['choices'][0]['message']['content'];
        document.getElementById("luck").innerHTML = result;
    });
}

window.getPrompt = async function(user_prompt='', system_prompt='', assistant_prompt='', max=50){
    if(user_prompt === ''){
        user_prompt = 'Write a sad poem about my border collie, Pepper';
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer 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`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
              {
                  'role':'system',
                  'content': system_prompt
              },
              {
                'role':'assistant',
                'content': assistant_prompt
              },
              {
                  'role': 'user',
                  'content': user_prompt
              }
          ],
          max_tokens: max
        })
      })

    return await response.json();
    //   .then(response => response.json())
    //   .then(data => {
    //     console.log(data);
    //     console.log(data['choices'][0]['message']['content']);
    //     var message = data['choices'][0]['message']['content'];
    //     return message;
    // });
}

