document.getElementById('extractBtn').addEventListener('click', () => { 
    const selector = document.getElementById('inputSelector').value;
    const selectorType = document.getElementById('selectorType').value; // Get the type (CSS or XPath)
  
    if (selector) {
      chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
        chrome.scripting.executeScript({
          target: {tabId: tabs[0].id},
          func: extractContent,
          args: [selector, selectorType]
        }, (result) => {
          if (result && result[0] && result[0].result) {
            const contentList = result[0].result.join("\n");
            document.getElementById('result').innerText = contentList;
            document.getElementById('copyBtn').style.display = 'block';
          } else {
            document.getElementById('result').innerText = 'No content found!';
            document.getElementById('copyBtn').style.display = 'none';
          }
        });
      });
    }
  });
  
  document.getElementById('copyBtn').addEventListener('click', () => {
    const content = document.getElementById('result').innerText;
    navigator.clipboard.writeText(content).then(() => {
      const message = document.querySelector('.message');
      message.style.display = 'block';
      setTimeout(() => {
        message.style.display = 'none';
      }, 1500);
    });
  });
  
  // Function to extract content, including from shadow DOMs
  function extractContent(selector, selectorType) {
    function getShadowRootElements(root, selector) {
      let elements = [];
      if (root.shadowRoot) {
        elements = elements.concat(Array.from(root.shadowRoot.querySelectorAll(selector)));
        const nestedShadowElements = Array.from(root.shadowRoot.querySelectorAll('*')).filter(el => el.shadowRoot);
        nestedShadowElements.forEach(el => {
          elements = elements.concat(getShadowRootElements(el, selector));
        });
      }
      return elements;
    }

    let elements = [];
    
    if (selectorType === 'css') {
      // Traverse through shadow DOMs and document
      elements = Array.from(document.querySelectorAll(selector));
      const shadowHosts = Array.from(document.querySelectorAll('*')).filter(el => el.shadowRoot);
      shadowHosts.forEach(host => {
        elements = elements.concat(getShadowRootElements(host, selector));
      });
    } else if (selectorType === 'xpath') {
      // Traverse for XPath
      function evaluateXPath(root, xpath) {
        let result = [];
        const xpathResult = document.evaluate(xpath, root, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
        for (let i = 0; i < xpathResult.snapshotLength; i++) {
          result.push(xpathResult.snapshotItem(i));
        }
        return result;
      }

      // Apply XPath on the document first
      elements = evaluateXPath(document, selector);

      // Traverse shadow roots for XPath
      const shadowHosts = Array.from(document.querySelectorAll('*')).filter(el => el.shadowRoot);
      shadowHosts.forEach(host => {
        elements = elements.concat(evaluateXPath(host.shadowRoot, selector));
      });
    }

    // Extract text content
    const content = Array.from(elements).map(el => el.textContent.trim());
    return content.filter(item => item !== "");
  }
