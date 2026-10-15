FROM python
LABEL maintainer = "bbradner@vt.edu"

ADD ugrad-emailer.py .
ADD requirements.txt .

RUN pip install -r requirements.txt
CMD [ "python", "ugrad-emailer.py" ]