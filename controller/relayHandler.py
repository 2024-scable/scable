from flask import Response
import requests, traceback
import threading

thread_local = threading.local()

def get_session():
    if not hasattr(thread_local, "session"):
        thread_local.session = requests.Session()
    return thread_local.session

def relayRequest(resourceUrl, path, method, header):
    print("[DEBUG] Request Artifact Path: /", path)
    print("[DEBUG] Relay URL: ", resourceUrl)
    
    try:
        session = get_session()
        res = session.request(url=resourceUrl, method=method, headers=header, stream=True, timeout=10)
        
        excluded_headers = [
            'content-encoding',
            'content-length',
            'transfer-encoding',
            'connection',
            'keep-alive',
            'proxy-authenticate',
            'proxy-authorization',
            'te',
            'trailers',
            'upgrade'
        ]
        responseHeaders = [
            (name, value) for name, value in res.raw.headers.items()
            if name.lower() not in excluded_headers
        ]

        response = Response(response=res.content, status=res.status_code, headers=responseHeaders)
        return response
    
    except requests.exceptions.Timeout:
        print("[ERROR] relay timeout error - ", resourceUrl)
        return Response({"error": "Relay request timed out."}, status=504)
    
    except requests.exceptions.RequestException as e:
        print("[ERROR] relay request exception - ", e)
        print(traceback.format_exc())
        return Response({"error": "Relay request failed."}, status=502)
    
    except Exception as e:
        print("[ERROR] relay error - ", e)
        print(traceback.format_exc())
        return Response({"error": "Internal Server Error"}, status=500)

from flask import Flask

app = Flask(__name__)

@app.teardown_appcontext
def teardown_session(exception=None):
    if hasattr(thread_local, "session"):
        thread_local.session.close()
