window.generateFromPrompt = function(){
    var input = document.getElementById("prompt").value;
    getPrompt(input);
}

window.getPrompt = async function(user_prompt='', system_prompt='', assistant_prompt='', max=50){
    if(user_prompt === ''){
        user_prompt = 'Write a sad poem about my border collie, Pepper';
    }

    fetch('https://api.openai.com/v1/chat/completions', {
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
      .then(response => response.json())
      .then(data => {
        console.log(data);
    });
}

