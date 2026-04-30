from django import forms


class SANAnswerForm(forms.Form):
    value = forms.IntegerField(min_value=-3, max_value=3)
